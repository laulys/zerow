import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { api, apiBase, onApiBase, type NewExpense, type RemoteExpense, type RemotePayment } from './api';
import { live } from './live';

// The trip the app is designed around. On its own the app runs on this sample
// data; pointed at the engine (see `data/api.ts`), Lisboa's expenses, drafts and
// payments come from the API and every change is sent to it (`data/live.ts`).

export type PersonId = 'tu' | 'ana' | 'luis' | 'marta';

export const people: Record<PersonId, { name: string; avatar: number }> = {
  tu: { name: 'Tú', avatar: require('../../assets/avatars/laura.png') },
  ana: { name: 'Ana', avatar: require('../../assets/avatars/ana.png') },
  luis: { name: 'Luis', avatar: require('../../assets/avatars/luis.png') },
  marta: { name: 'Marta', avatar: require('../../assets/avatars/marta.png') },
};

/** Who did something, at the start of a line: «Tú» for you, the name for anyone else. */
export const personName = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

/** A name as part of a link or an id: lower case, no accents, hyphens between words («Piso Calle Mayor» → «piso-calle-mayor»). */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export type Expense = {
  id: string;
  title: string;
  payer: PersonId;
  amountEur: number;
  originalUsd?: number;
  splitWith: PersonId[];
  note?: string;
  /** Its id in the engine, when it came from there. */
  remoteId?: number;
};

const confirmed: Expense[] = [
  { id: 'hotel', title: 'Hotel Alfama', payer: 'luis', amountEur: 269.08, originalUsd: 300, splitWith: ['tu', 'ana', 'luis', 'marta'] },
  { id: 'taxi', title: 'Taxi al hotel', payer: 'ana', amountEur: 40.36, originalUsd: 45, splitWith: ['ana', 'luis'] },
  { id: 'cena', title: 'Cena en Bairro Alto', payer: 'tu', amountEur: 138, splitWith: ['tu', 'ana', 'luis', 'marta'], note: 'propina 15\u00A0%' },
];

export const lunchDraft: Expense = {
  id: 'almuerzo',
  title: 'Almuerzo',
  payer: 'ana',
  amountEur: 38,
  splitWith: ['tu', 'ana', 'luis', 'marta'],
};

const ORDER: PersonId[] = ['tu', 'ana', 'luis', 'marta'];
/** The engine knows people by name; in the app you are «tú». */
const REMOTE_NAME: Record<PersonId, string> = { tu: 'Laura', ana: 'Ana', luis: 'Luis', marta: 'Marta' };
const personFor = (name: string): PersonId => ORDER.find((p) => REMOTE_NAME[p] === name) ?? 'tu';

/**
 * An expense from the engine in the app's shape. The sample trip's own expenses
 * keep their ids and notes (matched by name, once each), so the screens written
 * around them still recognise them; anything else gets an id from the engine's.
 */
function fromRemote(r: RemoteExpense, taken: Set<string>): Expense {
  const known = [...confirmed, lunchDraft].find((e) => e.title === r.description && !taken.has(e.id));
  const id = known ? known.id : `r${r.id}`;
  taken.add(id);
  const among = Object.keys(r.shares).map(personFor);
  return {
    id,
    remoteId: r.id,
    title: r.description,
    payer: personFor(r.paid_by),
    amountEur: r.trip_amount,
    originalUsd: r.currency === 'USD' ? r.amount : undefined,
    splitWith: ORDER.filter((p) => among.includes(p)),
    note: known?.note,
  };
}

const toRemote = (e: Expense): NewExpense => ({
  description: e.title,
  amount: e.originalUsd ?? e.amountEur,
  currency: e.originalUsd ? 'USD' : 'EUR',
  paid_by: REMOTE_NAME[e.payer],
  split_between: e.splitWith.map((p) => REMOTE_NAME[p]),
});

/** Sends an expense the app counts as confirmed: confirms the engine's draft, or adds it if the engine doesn't have it. */
const sendConfirmed = (e: Expense) =>
  live.push(async (trip) => {
    const id = live.idOf(e);
    if (id != null) await api.confirm(id);
    else live.remember(e.id, (await api.add(trip, toRemote(e))).id);
  });

/** A payment marked in Saldar. `id` is the app's own; `remoteId` the engine's, once it has one. */
export type Payment = Transfer & { id: string; remoteId?: number };

let paymentCount = 0;
const newPaymentId = () => `p${Date.now().toString(36)}${paymentCount++}`;

/**
 * The engine's payments in the app's shape. One the app already shows keeps its
 * own id, so its row in «Pagado» doesn't appear again when the trip is read.
 */
const paymentsFromRemote = (remote: RemotePayment[], shown: Payment[]): Payment[] =>
  remote.map((r) => {
    const local = shown.find((p) => live.idOf(p, 'payment') === r.id);
    return { id: local?.id ?? `rp${r.id}`, remoteId: r.id, from: personFor(r.from), to: personFor(r.to), amount: r.amount };
  });

const sendRemoved = (e: Expense) =>
  live.push(async () => {
    const id = live.idOf(e);
    if (id == null) return;
    await api.remove(id);
    live.forget(id);
  });

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
 * Greedy settle-up, same as zerow/settle.py: the person owed the most is paid
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

/**
 * Where everyone stands once the payments marked as paid are counted: each one
 * moves both people toward zero, so «A cero» in Saldar and the balances agree.
 */
export function settledBalances(expenses: Expense[], paid: Transfer[]): Record<PersonId, number> {
  const out = balancesFor(expenses);
  for (const x of paid) {
    out[x.from] = Math.round((out[x.from] + x.amount) * 100) / 100;
    out[x.to] = Math.round((out[x.to] - x.amount) * 100) / 100;
  }
  return out;
}

/** «3 gastos», «1 pago»: a count with its noun in the right number. */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** «Ana, Luis y tú»: names inside a sentence, you last, with «y» before the final one. */
export function nameList(ids: PersonId[]): string {
  const names = [...ids.filter((p) => p !== 'tu').map((p) => people[p].name), ...(ids.includes('tu') ? ['tú'] : [])];
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Piso Calle Mayor: the sample shared-flat group. Your 18,40 € share is to Ana. */
export const pisoGroup: Group = { id: 'piso', name: 'Piso Calle Mayor', kind: 'piso', dates: 'noviembre', currency: 'EUR', members: ['tu', 'ana', 'luis'] };
export const pisoExpenses: Expense[] = [
  { id: 'luz', title: 'Luz y agua de noviembre', payer: 'ana', amountEur: 55.2, splitWith: ['tu', 'ana', 'luis'] },
  { id: 'wifi', title: 'Internet de noviembre', payer: 'luis', amountEur: 30, splitWith: ['ana', 'luis'] },
];

/** Emoji for the open groups (settled ones keep theirs in `pastEmoji`). */
export const openEmoji: Record<string, string> = { lisboa: '🇵🇹', piso: '🔑' };
export const kindEmoji: Record<GroupKind, string> = { viaje: '✈️', piso: '🏠', evento: '🎉', otro: '🧾' };

/** Settled groups shown under "Anteriores" on Inicio. */
export const pastGroups = [
  { id: 'roma', kind: 'Viaje', name: 'Roma', people: 4, meta: 'Mar 2025 · 4 personas', total: 612.4, suggestions: ['🇮🇹', '✈️', '🍕', '🏟️', '🏖️', '⛰️', '🧳', '🍷'] },
  { id: 'malasana', kind: 'Piso', name: 'Piso Malasaña', people: 3, meta: '2023–24 · 3 personas', total: 4812.3, suggestions: ['🏠', '🛋️', '🔑', '🧺', '🪴', '🛒', '💡', '🇪🇸'] },
  { id: 'regalo', kind: 'Regalo', name: 'Regalo de Marta', people: 3, meta: 'Feb 2025 · entre 3', total: 96, suggestions: ['🎁', '🎂', '🎉', '💐', '🎈', '🥳', '💝', '🍰'] },
  { id: 'navidad', kind: 'Una cuenta', name: 'Cena de Navidad', people: 6, meta: 'Dic 2024 · 6 personas', total: 245.6, suggestions: ['🎄', '🍽️', '🍷', '🥂', '🎅', '⭐️', '🦃', '🎁'] },
] as const;

export type GroupKind = 'viaje' | 'piso' | 'evento' | 'otro';

export type Group = { id: string; name: string; kind: GroupKind; dates: string; currency: 'EUR' | 'USD'; members: PersonId[] };

/**
 * The invitation waiting for you (5.2): Ana asks you into a trip you're not in
 * yet. It shows up in Actividad; joining turns it into one of your groups.
 */
export const invite = { code: 'oporto-4f9x', from: 'ana' as PersonId, name: 'Oporto', dates: '5–8 dic', place: 'Portugal', inside: ['ana', 'luis', 'marta'] as PersonId[], sentAt: '15:20' };

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
  /** The payments already made in Lisboa, as records: they stay when the ledger changes and what is left is worked out again. */
  paid: Payment[];
  /** Your share in Piso Calle Mayor (sample group without its own ledger yet). */
  pisoPaid: boolean;
  /** What you have paid Ana in Piso so far. */
  pisoPaidAmount: number;
  payPiso: (amount: number) => void;
  /** Emoji chosen for each settled group, by id (falls back to the type icon). */
  pastEmoji: Record<string, string>;
  setPastEmoji: (id: string, emoji: string | null) => void;
  markPaid: (t: Transfer) => void;
  unmarkPaid: (p: Payment) => void;
  /**
   * Says something to the engine's agent about Lisboa. It answers and may propose an
   * expense, which comes back as a draft. `null` when the app runs on sample data.
   */
  ask: ((message: string) => Promise<{ reply: string; draft: Expense | null }>) | null;
};

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(confirmed);
  const [draft, setDraft] = useState<Expense | null>(lunchDraft);
  const [lastSaved, setLastSaved] = useState<Expense | null>(null);
  const [paid, setPaid] = useState<Payment[]>([]);
  const [pisoPaidAmount, setPisoPaidAmount] = useState(0);
  const pisoPaid = pisoPaidAmount > 0;
  const [pastEmoji, setPastEmojiState] = useState<Record<string, string>>({ roma: '🇮🇹', malasana: '🏠', regalo: '🎁', navidad: '🎄' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Record<string, Expense[]>>({ piso: pisoExpenses });

  // With an engine to talk to, Lisboa is whatever the engine says: the list and the
  // draft are replaced each time the trip is read. Without one, the sample trip.
  const connected = !!useSyncExternalStore(onApiBase, apiBase);
  useEffect(
    () =>
      live.start((trip) => {
        setLastSaved(null);
        if (!trip) {
          setExpenses(confirmed);
          setDraft(lunchDraft);
          setPaid([]);
          return;
        }
        const taken = new Set<string>();
        setExpenses([...trip.expenses].reverse().map((r) => fromRemote(r, taken)));
        setDraft(trip.drafts.length ? fromRemote(trip.drafts[0], taken) : null);
        setPaid((shown) => paymentsFromRemote(trip.payments ?? [], shown));
      }),
    [],
  );

  const value = useMemo<TripState>(
    () => ({
      groups,
      groupExpenses,
      addToGroup: (groupId, e) => setGroupExpenses((all) => ({ ...all, [groupId]: [e, ...(all[groupId] ?? [])] })),
      removeExpense: (groupId, id) => {
        if (groupId === 'lisboa') {
          const gone = expenses.find((e) => e.id === id);
          if (gone) sendRemoved(gone);
          setExpenses((list) => list.filter((e) => e.id !== id));
        } else setGroupExpenses((all) => ({ ...all, [groupId]: (all[groupId] ?? []).filter((e) => e.id !== id) }));
      },
      createGroup: (g) => {
        const made = { ...g, id: `${slug(g.name) || 'grupo'}-${Date.now().toString(36).slice(-4)}` };
        setGroups((list) => [made, ...list]);
        return made;
      },
      expenses,
      draft,
      lastSaved,
      paid,
      pisoPaid,
      pisoPaidAmount,
      payPiso: (amount) => setPisoPaidAmount((a) => Math.round((a + amount) * 100) / 100),
      pastEmoji,
      setPastEmoji: (id, emoji) =>
        setPastEmojiState((all) => {
          const next = { ...all };
          if (emoji) next[id] = emoji;
          else delete next[id];
          return next;
        }),
      markPaid: (t) => {
        const made: Payment = { ...t, id: newPaymentId() };
        setPaid((l) => [...l, made]);
        live.push(async (trip) => {
          const sent = await api.pay(trip, { from: REMOTE_NAME[t.from], to: REMOTE_NAME[t.to], amount: t.amount });
          live.remember(made.id, sent.id);
        });
      },
      unmarkPaid: (p) => {
        setPaid((l) => l.filter((x) => x.id !== p.id));
        live.push(async () => {
          const id = live.idOf(p, 'payment');
          if (id == null) return;
          await api.unpay(id);
          live.forget(id, 'payment');
        });
      },
      addExpense: (e) => {
        setExpenses((list) => [e, ...list]);
        setLastSaved(e);
        sendConfirmed(e);
      },
      confirmDraft: () => {
        if (!draft) return;
        setExpenses((list) => [draft, ...list]);
        setLastSaved(draft);
        setDraft(null);
        sendConfirmed(draft);
      },
      discardDraft: () => {
        if (draft) sendRemoved(draft);
        setDraft(null);
      },
      undoLast: () => {
        if (!lastSaved) return;
        setExpenses((list) => list.filter((e) => e.id !== lastSaved.id));
        setDraft(lastSaved);
        setLastSaved(null);
        const undone = lastSaved;
        live.push(async () => {
          const id = live.idOf(undone);
          if (id != null) await api.unconfirm(id);
        });
      },
      ask: connected
        ? async (message) => {
            const answer = await live.ask(message);
            const proposed = answer.drafts[answer.drafts.length - 1];
            // A card proposed in the chat is new: it never takes the id of one of the sample expenses.
            return { reply: answer.reply, draft: proposed ? fromRemote(proposed, new Set([...confirmed, lunchDraft].map((e) => e.id))) : null };
          }
        : null,
    }),
    [groups, groupExpenses, expenses, draft, lastSaved, paid, pisoPaid, pisoPaidAmount, pastEmoji, connected],
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
  // A non-breaking space before the currency, so an amount never breaks across two lines.
  return { whole, cents: `,${c}\u00A0${currency === 'EUR' ? '€' : 'US$'}` };
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
  const { expenses, paid, pisoPaidAmount, groups, groupExpenses } = useTrip();
  return useMemo(() => {
    const ids: Exclude<PersonId, 'tu'>[] = ['ana', 'luis', 'marta'];
    const out = Object.fromEntries(ids.map((id) => [id, { id, net: 0, parts: [] as PersonPart[] }])) as Record<Exclude<PersonId, 'tu'>, PersonBalance>;
    const add = (who: PersonId, part: PersonPart) => {
      if (who === 'tu') return;
      out[who].parts.push(part);
    };
    const fromTransfers = (list: Transfer[], key: string, group: string, to: string, members: PersonId[]) => {
      for (const m of members) {
        if (m === 'tu') continue;
        const amount = list.reduce((a, x) => a + (x.from === m && x.to === 'tu' ? x.amount : x.from === 'tu' && x.to === m ? -x.amount : 0), 0);
        add(m, { key, group, amount: Math.round(amount * 100) / 100, to });
      }
    };
    fromTransfers(settleUp(settledBalances(expenses, paid)), 'lisboa', 'Lisboa 2026', '/trip/lisboa', ['ana', 'luis', 'marta']);
    // Every part links to its group, so a row "a mano" still opens somewhere.
    // Piso: its bills (Ana's share is 18,40 € until you pay her), like any group.
    const pisoTransfers = settleUp(balancesFor(groupExpenses.piso ?? []));
    for (const m of ['ana', 'luis'] as const) {
      const owed = pisoTransfers.reduce((a, x) => a + (x.from === m && x.to === 'tu' ? x.amount : x.from === 'tu' && x.to === m ? -x.amount : 0), 0);
      const amount = Math.round((owed + (m === 'ana' ? pisoPaidAmount : 0)) * 100) / 100;
      add(m, { key: 'piso', group: 'Piso Calle Mayor', amount, to: amount < 0 && m === 'ana' ? '/pagar' : '/trip/piso' });
    }
    for (const g of groups.filter((g) => g.currency === 'EUR')) {
      fromTransfers(settleUp(balancesFor(groupExpenses[g.id] ?? [])), g.id, g.name, `/trip/${g.id}`, g.members);
    }
    for (const p of Object.values(out)) p.net = Math.round(p.parts.reduce((a, x) => a + x.amount, 0) * 100) / 100;
    return ids.map((id) => out[id]).sort((a, b) => Number(b.net !== 0) - Number(a.net !== 0));
  }, [expenses, paid, pisoPaidAmount, groups, groupExpenses]);
}

/** Your balance in Piso Calle Mayor: −18,40 € to Ana until you pay, plus anything added in the app. */
export function usePisoBalance(): number {
  const { pisoPaidAmount, groupExpenses } = useTrip();
  return Math.round((balancesFor(groupExpenses.piso ?? []).tu + pisoPaidAmount) * 100) / 100;
}
