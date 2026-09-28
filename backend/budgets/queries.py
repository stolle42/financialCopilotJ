from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db.models import Sum

from budgets.models import Budget
from domain import budgets as domain_budgets
from ledger.models import Kind, Transaction


def _decimal_string(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")), "f")


def _month_bounds(month: str) -> tuple[date, date]:
    year, month_num = (int(part) for part in month.split("-"))
    start = date(year, month_num, 1)
    end = domain_budgets.month_end(year, month_num)
    return start, end


def progress_for_month(month: str) -> list[dict]:
    start, end = _month_bounds(month)
    spent_by_category = {
        row["category_id"]: row["total"]
        for row in Transaction.objects.filter(
            date__gte=start,
            date__lte=end,
            kind=Kind.EXPENSE,
            category_id__isnull=False,
        )
        .values("category_id")
        .annotate(total=Sum("amount"))
    }
    items: list[dict] = []
    for budget in Budget.objects.select_related("category").all():
        spent = spent_by_category.get(budget.category_id, Decimal("0.00"))
        limit = budget.monthly_limit.quantize(Decimal("0.01"))
        spent = spent.quantize(Decimal("0.01"))
        flags = domain_budgets.progress(limit, spent)
        items.append(
            {
                "category": budget.category,
                "monthly_limit": _decimal_string(limit),
                "spent": _decimal_string(spent),
                "over_limit": flags["over_limit"],
            }
        )
    items.sort(key=lambda row: row["category"].name)
    return items
