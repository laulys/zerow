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
    for (const [side, name] of [
      [creditors, to],
      [debtors, from],
    ] as const) {
      side.set(name, side.get(name)! - c);
      if (side.get(name) === 0) side.delete(name);
    }
  }
  return out;
}

export const transferKey = (t: Transfer) => `${t.from}>${t.to}`;

/** Piso Calle Mayor: the sample shared-flat group. Your 18,40 € share is to Ana. */
export const pisoGroup: Group = { id: 'piso', name: 'Piso Calle Mayor', kind: 'piso', dates: 'noviembre', currency: 'EUR', members: ['tu', 'ana', 'luis'] };
export const pisoExpenses: Expense[] = [
  { id: 'luz', title: 'Luz y agua de noviembre', payer: 'ana', amountEur: 55.2, splitWith: ['tu', 'ana', 'luis'] },
  { id: 'wifi', title: 'Internet de noviembre', payer: 'luis', amountEur: 30, splitWith: ['ana', 'luis'] },
];
export const PISO_SHARE = 18.4;

/** Emoji for the open groups (settled ones keep theirs in `pastEmoji`). */
export const openEmoji: Record<string, string> = { lisboa: '🇵🇹', piso: '🔑' };
export const kindEmoji: Record<GroupKind, string> = { viaje: '✈️', piso: '🏠', evento: '🎉', otro: '🧾' };

/** Settled groups shown under "Anteriores" on Inicio. */
export const pastGroups = [
  { id: 'roma', kind: 'Viaje', name: 'Roma', meta: 'Mar 2025 · 4 personas', total: 612.4, suggestions: ['🇮🇹', '✈️', '🍕', '🏟️', '🏖️', '⛰️', '🧳', '🍷'] },
  { id: 'malasana', kind: 'Piso', name: 'Piso Malasaña', meta: '2023–24 · 3 personas', total: 4812.3, suggestions: ['🏠', '🛋️', '🔑', '🧺', '🪴', '🛒', '💡', '🇪🇸'] },
  { id: 'regalo', kind: 'Regalo', name: 'Regalo de Marta', meta: 'Feb 2025 · entre 3', total: 96, suggestions: ['🎁', '🎂', '🎉', '💐', '🎈', '🥳', '💝', '🍰'] },
  { id: 'navidad', kind: 'Una cuenta', name: 'Cena de Navidad', meta: 'Dic 2024 · 6 personas', total: 245.6, suggestions: ['🎄', '🍽️', '🍷', '🥂', '🎅', '⭐️', '🦃', '🎁'] },
] as const;
export type PastGroupId = (typeof pastGroups)[number]['id'];

export type GroupKind = 'viaje' | 'piso' | 'evento' | 'otro';

export type Group = { id: string; name: string; kind: GroupKind; dates: string; currency: 'EUR' | 'USD'; members: PersonId[] };

/**
 * The invitation waiting for you (5.2): Ana asks you into a trip you're not in
 * yet. It shows up in Actividad; joining turns it into one of your groups.
 */
export const invite = { code: 'oporto-4f9x', from: 'ana' as PersonId, name: 'Oporto', dates: '5–8 dic', place: 'Portugal', inside: ['ana', 'luis', 'marta'] as PersonId[], sentAt: '09:40' };

type TripState = {
  groups: Group[];
  createGroup: (g: Omit<Group, 'id'>) => Group;
  /** Expenses of the groups created in the app (Lisboa keeps `expenses`). */
  groupExpenses: Record<string, Expense[]>;
  addToGroup: (groupId: string, e: Expense) => void;
  /** Delete an expense from Lisboa ('lisboa') or any other group. */
  removeExpense: (groupId: string, id: string) => void;
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
  /** Emoji chosen for each settled group, by id (falls back to the type icon). */
  pastEmoji: Record<string, string>;
  setPastEmoji: (id: string, emoji: string | null) => void;
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
  const [pastEmoji, setPastEmojiState] = useState<Record<string, string>>({ roma: '🇮🇹', malasana: '🏠', regalo: '🎁', navidad: '🎄' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Record<string, Expense[]>>({ piso: pisoExpenses });

  const value = useMemo<TripState>(
    () => ({
      groups,
      groupExpenses,
      addToGroup: (groupId, e) => setGroupExpenses((all) => ({ ...all, [groupId]: [e, ...(all[groupId] ?? [])] })),
      removeExpense: (groupId, id) => {
        if (groupId === 'lisboa') {
          setExpenses((list) => list.filter((e) => e.id !== id));
          setPaid(new Set());
        } else setGroupExpenses((all) => ({ ...all, [groupId]: (all[groupId] ?? []).filter((e) => e.id !== id) }));
      },
      createGroup: (g) => {
        const slug =
          g.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'grupo';
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
      pastEmoji,
      setPastEmoji: (id, emoji) =>
        setPastEmojiState((all) => {
          const next = { ...all };
          if (emoji) next[id] = emoji;
          else delete next[id];
          return next;
        }),
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
    [groups, groupExpenses, expenses, draft, lastSaved, paid, pisoPaid, pastEmoji],
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

/** One open group's balance between you and someone. `amount` > 0: they owe you. */
export type PersonPart = { key: string; group: string; amount: number; to: string };
export type PersonBalance = { id: Exclude<PersonId, 'tu'>; net: number; parts: PersonPart[] };

/**
 * What you and each person owe each other across the open groups, for the
 * "Contactos" row on Inicio. Lisboa uses the settle-up transfers still unpaid;
 * Piso is your share to Ana; groups made in the app add theirs (euros only).
 * Ordered with pending money first.
 */
export function usePeopleBalances(): PersonBalance[] {
  const { expenses, paid, pisoPaid, groups, groupExpenses } = useTrip();
  return useMemo(() => {
    const ids: Exclude<PersonId, 'tu'>[] = ['ana', 'luis', 'marta'];
    const out = Object.fromEntries(ids.map((id) => [id, { id, net: 0, parts: [] as PersonPart[] }])) as Record<Exclude<PersonId, 'tu'>, PersonBalance>;
    const add = (who: PersonId, part: PersonPart) => {
      if (who === 'tu') return;
      out[who].parts.push(part);
    };
    const fromTransfers = (list: Transfer[], key: string, group: string, to: string, members: PersonId[], skipPaid: boolean) => {
      for (const m of members) {
        if (m === 'tu') continue;
        const amount = list.filter((x) => !(skipPaid && paid.has(transferKey(x)))).reduce((a, x) => a + (x.from === m && x.to === 'tu' ? x.amount : x.from === 'tu' && x.to === m ? -x.amount : 0), 0);
        add(m, { key, group, amount: Math.round(amount * 100) / 100, to });
      }
    };
    fromTransfers(settleUp(balancesFor(expenses)), 'lisboa', 'Lisboa 2026', '/trip/lisboa', ['ana', 'luis', 'marta'], true);
    // Every part links to its group, so a row "a mano" still opens somewhere.
    // Piso: its bills (Ana's share is 18,40 € until you pay her), like any group.
    const pisoTransfers = settleUp(balancesFor(groupExpenses.piso ?? []));
    for (const m of ['ana', 'luis'] as const) {
      const owed = pisoTransfers.reduce((a, x) => a + (x.from === m && x.to === 'tu' ? x.amount : x.from === 'tu' && x.to === m ? -x.amount : 0), 0);
      const amount = Math.round((owed + (m === 'ana' && pisoPaid ? PISO_SHARE : 0)) * 100) / 100;
      add(m, { key: 'piso', group: 'Piso Calle Mayor', amount, to: amount < 0 && m === 'ana' && !pisoPaid ? '/pagar' : '/trip/piso' });
    }
    for (const g of groups.filter((g) => g.currency === 'EUR')) {
      fromTransfers(settleUp(balancesFor(groupExpenses[g.id] ?? [])), g.id, g.name, `/trip/${g.id}`, g.members, false);
    }
    for (const p of Object.values(out)) p.net = Math.round(p.parts.reduce((a, x) => a + x.amount, 0) * 100) / 100;
    return ids.map((id) => out[id]).sort((a, b) => Number(b.net !== 0) - Number(a.net !== 0));
  }, [expenses, paid, pisoPaid, groups, groupExpenses]);
}

/** Your balance in Piso Calle Mayor: −18,40 € to Ana until you pay, plus anything added in the app. */
export function usePisoBalance(): number {
  const { pisoPaid, groupExpenses } = useTrip();
  return Math.round((balancesFor(groupExpenses.piso ?? []).tu + (pisoPaid ? PISO_SHARE : 0)) * 100) / 100;
}
