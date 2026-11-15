import { useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

/**
 * The states the API will bring: loading (6.1, 6.2), no groups yet (6.4) and no
 * connection (6.7). The app still runs on sample data, so today there is nothing
 * to load and no connection to lose. Until the data layer sets them, a link with
 * `?estado=cargando`, `?estado=sin-grupos` or `?estado=sin-conexion` shows each
 * one, and `?estado=normal` goes back. Development only, like `?device=`.
 */
export type AppState = 'normal' | 'cargando' | 'sin-grupos' | 'sin-conexion';

let current: AppState = 'normal';
const listeners = new Set<() => void>();
let started = false;

function read(url?: string | null) {
  const m = url?.match(/[?&]estado=(normal|cargando|sin-grupos|sin-conexion)/);
  if (!m || m[1] === current) return;
  current = m[1] as AppState;
  listeners.forEach((l) => l());
}

/** Starts listening for `?estado=` links. Called once from the root layout, so the first link already counts. */
export function watchAppState() {
  if (started || !__DEV__) return;
  started = true;
  Linking.getInitialURL().then(read);
  Linking.addEventListener('url', (e) => read(e.url));
}

function subscribe(listener: () => void) {
  watchAppState();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => current);
}
