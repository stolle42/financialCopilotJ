"""Domain tests for budgets (US4)."""

from datetime import date
from decimal import Decimal

from domain import budgets


def test_period_containing_is_calendar_month() -> None:
    assert budgets.period_containing(date(2026, 3, 15)) == "2026-03"


def test_most_recent_period_in_picks_latest_overlapping_month() -> None:
    assert budgets.most_recent_period_in(date(2026, 7, 1), date(2026, 9, 30)) == "2026-09"
    assert budgets.most_recent_period_in(date(2026, 7, 15), date(2026, 8, 10)) == "2026-08"


def test_progress_over_limit_when_spent_exceeds_limit() -> None:
    assert budgets.progress(Decimal("100.00"), Decimal("100.00"))["over_limit"] is False
    assert budgets.progress(Decimal("100.00"), Decimal("100.01"))["over_limit"] is True
    assert budgets.progress(Decimal("50.00"), Decimal("10.00"))["over_limit"] is False
