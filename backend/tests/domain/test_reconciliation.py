"""Domain tests for reconciliation (US5)."""

from datetime import date
from decimal import Decimal

from domain import reconciliation


def test_reconciliation_entry_expense_when_actual_is_lower() -> None:
    entry = reconciliation.reconciliation_entry(
        Decimal("100.00"),
        Decimal("85.00"),
        date(2026, 4, 1),
    )
    assert entry is not None
    assert entry["kind"] == "expense"
    assert entry["amount"] == Decimal("15.00")
    assert entry["date"] == date(2026, 4, 1)
    assert entry["description"] == "Reconciliation"


def test_reconciliation_entry_income_when_actual_is_higher() -> None:
    entry = reconciliation.reconciliation_entry(
        Decimal("100.00"),
        Decimal("120.00"),
        date(2026, 4, 2),
    )
    assert entry is not None
    assert entry["kind"] == "income"
    assert entry["amount"] == Decimal("20.00")


def test_reconciliation_entry_none_when_balances_match() -> None:
    assert (
        reconciliation.reconciliation_entry(
            Decimal("50.00"),
            Decimal("50.00"),
            date(2026, 4, 3),
        )
        is None
    )
