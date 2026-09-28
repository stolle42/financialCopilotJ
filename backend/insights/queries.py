from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncDay, TruncMonth

from domain import insights as domain_insights
from ledger.models import Category, Kind, Transaction


def _decimal_string(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")), "f")


def _share_string(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.0001")), "f")


def _category_rows(*, side: str, start: date, end: date) -> list[dict]:
    qs = (
        Transaction.objects.filter(
            date__gte=start,
            date__lte=end,
            kind=Kind.EXPENSE if side == "expense" else Kind.INCOME,
        )
        .values("category_id")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    category_ids = [row["category_id"] for row in qs if row["category_id"] is not None]
    categories = Category.objects.in_bulk(category_ids)
    rows: list[dict] = []
    for row in qs:
        category_id = row["category_id"]
        if category_id is None:
            continue
        category = categories[category_id]
        rows.append(
            {
                "category_id": category.id,
                "name": category.name,
                "colour": category.colour,
                "side": category.side,
                "protected_role": category.protected_role,
                "amount": row["total"],
            }
        )
    return rows


def insights_payload(*, start: date, end: date) -> dict:
    bucket_dates = domain_insights.buckets(start, end)
    daily = domain_insights.period_within_one_calendar_month(start, end)
    expense_qs = Transaction.objects.filter(
        date__gte=start,
        date__lte=end,
        kind=Kind.EXPENSE,
    )
    if expense_qs.exists():
        trunc = TruncDay("date") if daily else TruncMonth("date")
        aggregated = expense_qs.annotate(bucket=trunc).values("bucket").annotate(
            total=Sum("amount")
        )
        bucket_lookup: dict[date, Decimal] = {}
        for row in aggregated:
            bucket_value = row["bucket"]
            if bucket_value is None:
                continue
            bucket_date = (
                bucket_value.date()
                if isinstance(bucket_value, datetime)
                else bucket_value
            )
            if not daily:
                bucket_date = date(bucket_date.year, bucket_date.month, 1)
            bucket_lookup[bucket_date] = row["total"]

        spending_rows = [
            (bucket, "expense", bucket_lookup.get(bucket, Decimal("0.00")))
            for bucket in bucket_dates
        ]
        spending = domain_insights.spending_over_time(
            bucket_dates,
            daily=daily,
            rows=spending_rows,
        )
    else:
        spending = []

    expense_breakdown = domain_insights.breakdown(_category_rows(side="expense", start=start, end=end))
    income_breakdown = domain_insights.breakdown(_category_rows(side="income", start=start, end=end))

    return {
        "spending_over_time": [
            {"bucket": item["bucket"], "amount": _decimal_string(item["amount"])}
            for item in spending
        ],
        "expense_breakdown": [
            {
                "category": item["category"],
                "amount": _decimal_string(item["amount"]),
                "share": _share_string(item["share"]),
            }
            for item in expense_breakdown
        ],
        "income_breakdown": [
            {
                "category": item["category"],
                "amount": _decimal_string(item["amount"]),
                "share": _share_string(item["share"]),
            }
            for item in income_breakdown
        ],
    }
