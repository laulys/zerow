import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Sample data for the design phase. It mirrors the backend's trip, balances and
// draft shapes (bill_buddy/api.py) so the screens can switch to the real API later.

export type PersonId = 'tu' | 'ana' | 'luis' | 'marta';

export const people: Record<PersonId, { name: string; avatar: number }> = {
  tu: { name: 'Tú', avatar: require('../../assets/avatars/laura.png') },
  ana: { name: 'Ana', avatar: require('../../assets/avatars/ana.png') },
  luis: { name: 'Luis', avatar: require('../../assets/avatars/luis.png') },
  marta: { name: 'Marta', avatar: require('../../assets/avatars/marta.png') },
};

export type Expense = {
  id: string;
  title: string;
  payer: PersonId;
  amountEur: number;
  originalUsd?: number;
  splitWith: PersonId[];
  note?: string;
};

const confirmed: Expense[] = [
  { id: 'hotel', title: 'Hotel Alfama', payer: 'luis', amountEur: 269.08, originalUsd: 300, splitWith: ['tu', 'ana', 'luis', 'marta'] },
  { id: 'taxi', title: 'Taxi al hotel', payer: 'ana', amountEur: 40.36, originalUsd: 45, splitWith: ['ana', 'luis'] },
  { id: 'cena', title: 'Cena en Bairro Alto', payer: 'tu', amountEur: 138, splitWith: ['tu', 'ana', 'luis', 'marta'], note: 'propina 15 %' },
];

export const lunchDraft: Expense = {
  id: 'almuerzo',
  title: 'Almuerzo',
  payer: 'ana',
  amountEur: 38,
  splitWith: ['tu', 'ana', 'luis', 'marta'],
};

/** Net balance per person: what they paid minus their share. Sums to zero. */
export function balancesFor(expenses: Expense[]): Record<PersonId, number> {
  const out: Record<PersonId, number> = { tu: 0, ana: 0, luis: 0, marta: 0 };
  for (const e of expenses) {
    out[e.payer] += e.amountEur;
    const share = e.amountEur / e.splitWith.length;
    for (const p of e.splitWith) out[p] -= share;
  }
  for (const k of Object.keys(out) as PersonId[]) out[k] = Math.round(out[k] * 100) / 100;
  return out;
}

export type Transfer = { from: PersonId; to: PersonId; amount: number };

/**
 * Greedy settle-up, same as bill_buddy/settle.py: the person owed the most is paid
 * by the person who owes the most. At most (people − 1) transfers. Works in cents.
 */
export function settleUp(balances: Record<PersonId, number>): Transfer[] {
  const cents = Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, Math.round(v * 100)])) as Record<PersonId, number>;
  const drift = Object.values(cents).reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const biggest = (Object.keys(cents) as PersonId[]).sort((a, b) => Math.abs(cents[b]) - Math.abs(cents[a]))[0];
    cents[biggest] -= drift;
  }
  const creditors = new Map((Object.keys(cents) as PersonId[]).filter((k) => cents[k] > 0).map((k) => [k, cents[k]]));
  const debtors = new Map((Object.keys(cents) as PersonId[]).filter((k) => cents[k] < 0).map((k) => [k, -cents[k]]));
  const out: Transfer[] = [];
  const pick = (m: Map<PersonId, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0];
  while (creditors.size && debtors.size) {
    const to = pick(creditors);
    const from = pick(debtors);
    const c = Math.min(creditors.get(to)!, debtors.get(from)!);
    out.push({ from, to, amount: c / 100 });
    for (const [side, name] of [[creditors, to], [debtors, from]] as const) {
      side.set(name, side.get(name)! - c);
      if (side.get(name) === 0) side.delete(name);
    }
  }
  return out;
}

export const transferKey = (t: Transfer) => `${t.from}>${t.to}`;

export type GroupKind = 'viaje' | 'piso' | 'evento' | 'otro';

export type Group = { id: string; name: string; kind: GroupKind; dates: string; currency: 'EUR' | 'USD'; members: PersonId[] };

type TripState = {
  groups: Group[];
  createGroup: (g: Omit<Group, 'id'>) => Group;
  /** Expenses of the groups created in the app (Lisboa keeps `expenses`). */
  groupExpenses: Record<string, Expense[]>;
  addToGroup: (groupId: string, e: Expense) => void;
  expenses: Expense[];
  draft: Expense | null;
  confirmDraft: () => void;
  discardDraft: () => void;
  undoLast: () => void;
  lastSaved: Expense | null;
  addExpense: (e: Expense) => void;
  paid: Set<string>;
  /** Your share in Piso Calle Mayor (sample group without its own ledger yet). */
  pisoPaid: boolean;
  payPiso: () => void;
  markPaid: (t: Transfer) => void;
  unmarkPaid: (t: Transfer) => void;
};

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(confirmed);
  const [draft, setDraft] = useState<Expense | null>(lunchDraft);
  const [lastSaved, setLastSaved] = useState<Expense | null>(null);
  const [paid, setPaid] = useState<Set<string>>(new Set());
  const [pisoPaid, setPisoPaid] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Record<string, Expense[]>>({});

  const value = useMemo<TripState>(
    () => ({
      groups,
      groupExpenses,
      addToGroup: (groupId, e) => setGroupExpenses((all) => ({ ...all, [groupId]: [e, ...(all[groupId] ?? [])] })),
      createGroup: (g) => {
        const slug = g.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grupo';
        const made = { ...g, id: `${slug}-${Date.now().toString(36).slice(-4)}` };
        setGroups((list) => [made, ...list]);
        return made;
      },
      expenses,
      draft,
      lastSaved,
      paid,
      pisoPaid,
      payPiso: () => setPisoPaid(true),
      markPaid: (t) => setPaid((s) => new Set(s).add(transferKey(t))),
      unmarkPaid: (t) =>
        setPaid((s) => {
          const n = new Set(s);
          n.delete(transferKey(t));
          return n;
        }),
      addExpense: (e) => {
        setExpenses((list) => [e, ...list]);
        setLastSaved(e);
        setPaid(new Set());
      },
      confirmDraft: () => {
        if (!draft) return;
        setExpenses((list) => [draft, ...list]);
        setLastSaved(draft);
        setDraft(null);
      },
      discardDraft: () => setDraft(null),
      undoLast: () => {
        if (!lastSaved) return;
        setExpenses((list) => list.filter((e) => e.id !== lastSaved.id));
        setDraft(lastSaved);
        setLastSaved(null);
      },
    }),
    [groups, groupExpenses, expenses, draft, lastSaved, paid, pisoPaid],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripState {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside <TripProvider>');
  return ctx;
}

export type Currency = 'EUR' | 'USD';

export function formatEur(n: number, currency: Currency = 'EUR'): { whole: string; cents: string } {
  const fixed = Math.abs(n).toFixed(2);
  const [w, c] = fixed.split('.');
  // Always group thousands (4.812,30 €), as in the designs; es-ES skips it for 4 digits.
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { whole, cents: `,${c} ${currency === 'EUR' ? '€' : 'US$'}` };
}

export function eurText(n: number, currency: Currency = 'EUR'): string {
  const { whole, cents } = formatEur(n, currency);
  return `${whole}${cents}`;
}
