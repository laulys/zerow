import type { PersonId } from './trip';

// A small local stand-in for the AI agent (bill_buddy/trip_agent.py) while the app
// isn't connected to the API. It follows the same rule as the real agent:
// it never invents an amount; if the message has none, it asks.

export type Partial = { title?: string; amountEur?: number; originalUsd?: number; splitWith?: PersonId[] };

const USD_TO_EUR = 1 / 1.1149; // 1 € = 1,1149 US$ on the day of the sample data: 45 US$ ≈ 40,36 €, 300 US$ ≈ 269,08 €

const names: Record<string, PersonId> = { ana: 'ana', luis: 'luis', marta: 'marta' };

export function interpret(text: string, previous: Partial): Partial {
  const lower = text.toLowerCase();
  const out: Partial = { ...previous };

  const money = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(€|euros?|eur|\$|us\$|d[oó]lares?|usd)?/);
  if (money) {
    const value = parseFloat(money[1].replace(',', '.'));
    const isUsd = !!money[2] && /\$|d[oó]lar|usd/.test(money[2]);
    if (isUsd) {
      out.originalUsd = value;
      out.amountEur = Math.round(value * USD_TO_EUR * 100) / 100;
    } else {
      out.amountEur = value;
      out.originalUsd = undefined;
    }
  }

  const what = lower.match(/pagu[eé]\s+(?:(?:el|la|los|las|un|una|unos|unas)\s+)?([a-záéíóúñü0-9 ]+?)(?=,|\s+de todos|\s+para|\s+entre|\s+\d|$)/);
  if (what && what[1].trim()) {
    const t = what[1].trim();
    out.title = t.charAt(0).toUpperCase() + t.slice(1);
  }

  if (/de todos|para todos|entre todos|entre 4|entre cuatro/.test(lower)) out.splitWith = ['tu', 'ana', 'luis', 'marta'];
  const forSome = [...lower.matchAll(/para (ana|luis|marta)/g)].map((m) => names[m[1]]);
  if (forSome.length) out.splitWith = [...new Set<PersonId>([...(/para m[ií]|y yo|y para m/.test(lower) ? (['tu'] as PersonId[]) : []), ...forSome])];
  if (!out.splitWith && (out.title || out.amountEur)) out.splitWith = previous.splitWith;

  return out;
}

export function missing(p: Partial): 'title' | 'amount' | null {
  if (!p.title) return 'title';
  if (p.amountEur === undefined) return 'amount';
  return null;
}
