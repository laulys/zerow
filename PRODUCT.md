# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

<!-- Inferred, not asked directly: Expo / React Native app designed iPhone-first (the user has shipped Expo work before). Android comes later with the same design. -->

## Stack

Expo (React Native) app talking to the existing Python backend in this repo (FastAPI + SQLite, `zerow/api.py`). Design happens in Figma first, then Expo.

## Users

Groups of friends (about 2–8 people) on a trip together. Each person has their phone and records expenses on the go: in a taxi, at the restaurant table, at a ticket counter. Usually one hand is busy and attention is short. At the end of the trip, someone needs a clear answer to "who owes whom".

## Product Purpose

Make shared trip expenses effortless to record and painless to settle. Instead of filling out forms, people say or type what happened ("I paid the taxi, 45 dollars, for Ana and me"). The assistant turns that into an expense card that a person confirms. Success means every expense gets recorded during the trip, nobody argues about the numbers, and the trip settles in a few transfers.

## Positioning

The AI is the input method, not the decision-maker. It proposes draft expense cards from natural language. People confirm them with one tap. The AI never saves, edits or deletes money on its own, and it never invents amounts (code guardrails enforce this). Settle-up uses at most n−1 transfers.

## Operating Context

- Used during the trip, often outdoors or in noisy places, with quick one-handed interactions.
- The core loop has four steps: message → draft card → confirm or discard → balances update.
- End of trip: someone opens "settle up" and the group pays each other.
- Two currencies: USD and EUR. Each trip has a main currency. Expenses in the other currency show both amounts ("$45 ≈ 40,36 €").

## Capabilities and Constraints

- Backend endpoints (already built): create trip, trip detail (members, expenses, drafts, balances), chat (reply, new drafts, tool steps), manual expense, confirm or discard a draft, balances with settle-up.
- The assistant can ask follow-up questions ("How much was lunch?") instead of guessing.
- Expenses are split equally between some or all members. Itemized splits and receipt photos are planned, not built.
- Supported currencies: USD and EUR only.
- Undecided: authentication and accounts, sharing a trip with friends (invite flow), and payment integrations ("mark as paid" is manual).

## Brand Commitments

- Name: **Zerow** (zero + owe), confirmed by the user. The project was first called Bill Buddy.
- Logo (confirmed): two offset halves of a coin, in black, which slide together into a zero when the trip settles. Brand moments (app icon, welcome, the AI draft card, settled state, shared summary) use a grainy lime-and-mint flowing gradient; everyday screens stay on flat surfaces. The draft card keeping the gradient is a deliberate choice by the user (reviewed after the Nov 2026 audit), not an oversight.
- Avatars: in the designs, original 3D sticker-style avatars; in the app, each person picks a photo, their own Memoji or initials.
- Personality (confirmed by the user): **warm, playful, trustworthy**. Like an organized friend: fun in the details, serious about money.
- Motion (confirmed): **expressive with purpose**. Clearly noticeable at key moments (the AI card appearing, confirming, settling up) and subtle elsewhere, with a reduced-motion version.
- Anti-references (confirmed): not a serious banking app (navy, tables, cold corporate tone); not a copy of the Dribbble "Bill Splitter" reference the user shared (its purple + peach palette and notched receipt cards are wireframe inspiration only); not generic AI style (purple gradients, glassmorphism, neon glows, everything rounded); not Splitwise (functional but flat, lists and forms).

## Evidence on Hand

- A working backend with 110 tests. There are no real users, testimonials or metrics yet; don't fabricate any.
- Sample data for designs: trip "Lisboa 2026", members Laura, Ana, Luis and Marta, currency EUR. Expenses: dinner €138 (including 15% tip, paid by Laura), taxi $45 ≈ €40.36 (paid by Ana, split between Ana and Luis), hotel $300 ≈ €269.08 (paid by Luis).

## Product Principles

1. **The AI suggests, people decide.** Every AI output is a visible, reversible draft until a person confirms it.
2. **Numbers come from people.** If something is missing, ask; never guess.
3. **Effortless capture beats perfect data.** Recording an expense should take seconds, mid-trip.
4. **Settle-up is the payoff.** The end-of-trip moment should feel clear, fair and a little celebratory.
5. **Friendly, never flippant, about money.** Playful in tone and motion; exact and legible in every amount.

## Accessibility & Inclusion

No specific standard was given. Target WCAG 2.2 AA contrast and touch targets of at least 44 pt. Every animation needs a reduced-motion alternative, and meaning (draft vs confirmed, owes vs owed) must never depend on color alone.
