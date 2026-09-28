"""Domain tests for insights (US3)."""

from datetime import date
from decimal import Decimal

from domain import insights


def test_buckets_yields_days_within_one_calendar_month() -> None:
    start = date(2026, 3, 10)
    end = date(2026, 3, 12)
    assert insights.buckets(start, end) == [
        date(2026, 3, 10),
        date(2026, 3, 11),
        date(2026, 3, 12),
    ]


def test_buckets_yields_months_when_period_spans_months() -> None:
    start = date(2026, 2, 15)
    end = date(2026, 4, 10)
    assert insights.buckets(start, end) == [
        date(2026, 2, 1),
        date(2026, 3, 1),
        date(2026, 4, 1),
    ]


def test_spending_over_time_sums_expenses_per_bucket_ignores_transfers() -> None:
    bucket_dates = [date(2026, 3, 1), date(2026, 3, 2)]
    rows = [
        (date(2026, 3, 1), "expense", Decimal("10.00")),
        (date(2026, 3, 1), "transfer", Decimal("50.00")),
        (date(2026, 3, 1), "income", Decimal("100.00")),
        (date(2026, 3, 2), "expense", Decimal("5.50")),
    ]
    result = insights.spending_over_time(bucket_dates, daily=True, rows=rows)
    assert result == [
        {"bucket": date(2026, 3, 1), "amount": Decimal("10.00")},
        {"bucket": date(2026, 3, 2), "amount": Decimal("5.50")},
    ]


def test_spending_over_time_monthly_buckets() -> None:
    bucket_dates = [date(2026, 1, 1), date(2026, 2, 1)]
    rows = [
        (date(2026, 1, 15), "expense", Decimal("3.00")),
        (date(2026, 2, 20), "expense", Decimal("7.00")),
    ]
    result = insights.spending_over_time(bucket_dates, daily=False, rows=rows)
    assert result == [
        {"bucket": date(2026, 1, 1), "amount": Decimal("3.00")},
        {"bucket": date(2026, 2, 1), "amount": Decimal("7.00")},
    ]


def test_breakdown_includes_shares_for_all_categories_including_protected() -> None:
    rows = [
        {
            "category_id": 1,
            "name": "Groceries",
            "colour": "#111",
            "side": "expense",
            "protected_role": None,
            "amount": Decimal("25.00"),
        },
        {
            "category_id": 2,
            "name": "Uncategorised",
            "colour": "#94a3b8",
            "side": "expense",
            "protected_role": "uncategorised",
            "amount": Decimal("25.00"),
        },
        {
            "category_id": 3,
            "name": "Unaccounted",
            "colour": "#94a3b8",
            "side": "expense",
            "protected_role": "unaccounted",
            "amount": Decimal("50.00"),
        },
    ]
    result = insights.breakdown(rows)
    assert len(result) == 3
    by_name = {item["category"]["name"]: item for item in result}
    assert by_name["Unaccounted"]["share"] == Decimal("0.50")
    assert by_name["Groceries"]["share"] == Decimal("0.25")
    assert sum(item["share"] for item in result) == Decimal("1.00")


def test_empty_inputs_yield_empty_outputs() -> None:
    assert insights.spending_over_time([], daily=True, rows=[]) == []
    assert insights.breakdown([]) == []
