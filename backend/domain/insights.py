"""Pure-Python insights aggregation (US3)."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from decimal import Decimal
from typing import Any


def period_within_one_calendar_month(start: date, end: date) -> bool:
    return start.year == end.year and start.month == end.month


def buckets(start: date, end: date) -> list[date]:
    if start > end:
        return []
    if period_within_one_calendar_month(start, end):
        result: list[date] = []
        current = start
        while current <= end:
            result.append(current)
            current += timedelta(days=1)
        return result
    result = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        result.append(date(year, month, 1))
        if month == 12:
            year += 1
            month = 1
        else:
            month += 1
    return result


def _bucket_key(value: date, *, daily: bool) -> date:
    if daily:
        return value
    return date(value.year, value.month, 1)


def spending_over_time(
    bucket_dates: list[date],
    *,
    daily: bool,
    rows: Iterable[tuple[date, str, Decimal]],
) -> list[dict[str, Any]]:
    if not bucket_dates:
        return []
    totals = {bucket: Decimal("0.00") for bucket in bucket_dates}
    for posted_on, kind, amount in rows:
        if kind != "expense":
            continue
        key = _bucket_key(posted_on, daily=daily)
        if key in totals:
            totals[key] += amount
    return [
        {"bucket": bucket, "amount": totals[bucket].quantize(Decimal("0.01"))}
        for bucket in bucket_dates
    ]


def breakdown(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    total = sum((row["amount"] for row in rows), Decimal("0.00"))
    result: list[dict[str, Any]] = []
    for row in rows:
        share = (
            Decimal("0.00")
            if total == 0
            else (row["amount"] / total).quantize(Decimal("0.0001"))
        )
        result.append(
            {
                "category": {
                    "id": row["category_id"],
                    "name": row["name"],
                    "colour": row["colour"],
                    "side": row["side"],
                    "protected_role": row["protected_role"],
                },
                "amount": row["amount"].quantize(Decimal("0.01")),
                "share": share,
            }
        )
    result.sort(key=lambda item: item["amount"], reverse=True)
    return result
