import { Linking } from 'react-native';

/**
 * The engine's API (`zerow/api.py`, FastAPI). The app only talks to it when it
 * knows where it is: `EXPO_PUBLIC_ZEROW_API` in `app/.env`, or in development a
 * link with `?api=http://localhost:8000` (`?api=off` goes back to sample data).
 * Without it the app runs on its built-in sample trip, as before.
 */
export type RemoteExpense = {
  id: number;
  description: string;
  amount: number;
  currency: 'EUR' | 'USD';
  rate: number;
  trip_amount: number;
  paid_by: string;
  shares: Record<string, number>;
  status: 'draft' | 'confirmed';
  created_at: string;
};

export type RemoteTrip = {
  id: number;
  name: string;
  currency: 'EUR' | 'USD';
  members: string[];
  expenses: RemoteExpense[];
  drafts: RemoteExpense[];
};

export type NewExpense = { description: string; amount: number; currency: 'EUR' | 'USD'; paid_by: string; split_between?: string[] };

/** The server answered, but with an error of ours (4xx): retrying won't help. */
export class Rejected extends Error {}

let base: string | null = process.env.EXPO_PUBLIC_ZEROW_API?.replace(/\/$/, '') || null;
const listeners = new Set<() => void>();
let watching = false;

function read(url?: string | null) {
  const m = url?.match(/[?&]api=([^&]+)/);
  if (!m) return;
  const value = decodeURIComponent(m[1]);
  const next = value === 'off' ? null : value.replace(/\/$/, '');
  if (next === base) return;
  base = next;
  listeners.forEach((l) => l());
}

/** Development only: `?api=…` in a link points the app at an engine without rebuilding. */
export function watchApiBase() {
  if (watching || !__DEV__) return;
  watching = true;
  Linking.getInitialURL().then(read);
  Linking.addEventListener('url', (e) => read(e.url));
}

export const apiBase = () => base;

export function onApiBase(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }, timeout = 8000): Promise<T> {
  if (!base) throw new Error('No API');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeout);
  try {
    const res = await fetch(base + path, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: abort.signal,
    });
    if (res.status >= 400 && res.status < 500) throw new Rejected(`${res.status} ${path}`);
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return (res.status === 204 ? undefined : await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  trips: () => call<{ id: number; name: string }[]>('/trips'),
  createTrip: (name: string, members: string[]) => call<{ id: number }>('/trips', { method: 'POST', body: { name, currency: 'EUR', members } }),
  trip: (id: number) => call<RemoteTrip>(`/trips/${id}`),
  add: (tripId: number, e: NewExpense) => call<RemoteExpense>(`/trips/${tripId}/expenses`, { method: 'POST', body: e }),
  confirm: (id: number) => call<RemoteExpense>(`/expenses/${id}/confirm`, { method: 'POST' }),
  unconfirm: (id: number) => call<RemoteExpense>(`/expenses/${id}/unconfirm`, { method: 'POST' }),
  remove: (id: number) => call<void>(`/expenses/${id}`, { method: 'DELETE' }),
  /** The agent runs a local model, so an answer can take a while. */
  chat: (tripId: number, user: string, message: string) => call<{ reply: string; drafts: RemoteExpense[] }>(`/trips/${tripId}/chat`, { method: 'POST', body: { user, message } }, 90000),
};
