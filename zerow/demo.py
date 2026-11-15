"""Load the sample trip the app is designed around.

    python -m zerow.demo            # creates "Lisboa 2026" if it isn't there yet
    python -m zerow.demo --reset    # deletes it first and starts again

Lisboa 2026 has four people, three confirmed expenses (two of them paid in
dollars) and one draft waiting for review, so the app opens on the same figures
as its design: you are owed 36,23 €, and 26,73 € once the lunch is confirmed.
"""

from __future__ import annotations

import argparse
from typing import Optional

from . import currency, ledger

TRIP = "Lisboa 2026"
MEMBERS = ["Laura", "Ana", "Luis", "Marta"]
# What one euro bought in dollars on the day of the sample expenses (300 US$ ≈ 269,08 €).
EUR_TO_USD = 1.1149

EXPENSES = [
    # description, amount, currency, paid by, split between (None = everyone), status
    ("Hotel Alfama", 300, "USD", "Luis", None, "confirmed"),
    ("Taxi al hotel", 45, "USD", "Ana", ["Ana", "Luis"], "confirmed"),
    ("Cena en Bairro Alto", 138, "EUR", "Laura", None, "confirmed"),
    ("Almuerzo", 38, "EUR", "Ana", None, "draft"),
]


def _fixed_rate(amount, from_currency: str, to_currency: str) -> dict:
    """The sample trip uses the rate of its own day, not today's."""
    rate = 1.0 if from_currency == to_currency else (1 / EUR_TO_USD if from_currency == "USD" else EUR_TO_USD)
    return {"rate": rate}


def load(db_path: Optional[str] = None, reset: bool = False) -> dict:
    """Create the sample trip (once) and return it."""
    with ledger.session(db_path) as conn:
        existing = [t for t in ledger.list_trips(conn) if t["name"] == TRIP]
        if existing and not reset:
            return existing[0]
        for trip in existing:
            for expense in ledger.list_expenses(conn, trip["id"]):
                ledger.delete_expense(conn, expense["id"])
            conn.execute("DELETE FROM members WHERE trip_id = ?", (trip["id"],))
            conn.execute("DELETE FROM trips WHERE id = ?", (trip["id"],))

        trip = ledger.create_trip(conn, TRIP, "EUR", MEMBERS)
        live_convert = currency.convert
        currency.convert = _fixed_rate
        try:
            for description, amount, code, paid_by, split, status in EXPENSES:
                ledger.add_expense(conn, trip["id"], description, amount, code, paid_by, split, status=status)
        finally:
            currency.convert = live_convert
        return trip


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m zerow.demo", description=__doc__.splitlines()[0])
    parser.add_argument("--reset", action="store_true", help="delete the sample trip and load it again")
    args = parser.parse_args()
    trip = load(reset=args.reset)
    with ledger.session() as conn:
        net = ledger.balances(conn, trip["id"])["net"]
    print(f'{TRIP} is trip {trip["id"]} in {ledger.default_db_path()}. Laura is owed {net["Laura"]:.2f} EUR.')


if __name__ == "__main__":
    main()
