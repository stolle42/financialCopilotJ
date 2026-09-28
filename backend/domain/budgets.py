"""Pure-Python budget rules (US4)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal


def month_end(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def period_containing(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def _month_overlaps(start: date, end: date, year: int, month: int) -> bool:
    month_start = date(year, month, 1)
    month_end_day = month_end(year, month)
    return month_start <= end and month_end_day >= start


def most_recent_period_in(start: date, end: date) -> str:
    if start > end:
        return period_containing(start)
    year, month = end.year, end.month
    while True:
        if _month_overlaps(start, end, year, month):
            return f"{year:04d}-{month:02d}"
        if month == 1:
            year -= 1
            month = 12
        else:
            month -= 1


def progress(limit: Decimal, spent: Decimal) -> dict[str, bool]:
    return {"over_limit": spent > limit}
