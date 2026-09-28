from decimal import Decimal, InvalidOperation

from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router
from ninja.errors import HttpError

from budgets.models import Budget
from budgets.queries import progress_for_month
from budgets.schemas import BudgetLimitIn, BudgetOut, BudgetProgressItemOut
from domain import budgets as domain_budgets
from ledger.models import Category, Side

router = Router(tags=["budgets"])


def _budgetable(category: Category) -> bool:
    return category.side == Side.EXPENSE and category.protected_role is None


def _ensure_budgetable(category: Category) -> None:
    if not _budgetable(category):
        raise HttpError(409, "budgets apply only to non-protected expense categories")


def _budget_out(budget: Budget) -> dict:
    return {
        "category": budget.category,
        "monthly_limit": format(budget.monthly_limit.quantize(Decimal("0.01")), "f"),
    }


@router.get("/budgets", response=list[BudgetProgressItemOut])
def list_budget_progress(request, month: str | None = Query(None)):
    if month is None:
        month = domain_budgets.period_containing(timezone.localdate())
    return progress_for_month(month)


@router.put("/budgets/{category_id}", response=BudgetOut)
def put_budget(request, category_id: int, body: BudgetLimitIn):
    category = get_object_or_404(Category, pk=category_id)
    _ensure_budgetable(category)
    try:
        limit = Decimal(body.monthly_limit)
    except InvalidOperation as exc:
        raise HttpError(400, "invalid monthly_limit") from exc
    if limit <= 0:
        raise HttpError(400, "monthly_limit must be greater than zero")
    budget, _created = Budget.objects.update_or_create(
        category=category,
        defaults={"monthly_limit": limit.quantize(Decimal("0.01"))},
    )
    return _budget_out(budget)


@router.delete("/budgets/{category_id}", response={204: None})
def delete_budget(request, category_id: int):
    category = get_object_or_404(Category, pk=category_id)
    try:
        budget = Budget.objects.get(category=category)
    except Budget.DoesNotExist as exc:
        raise Http404 from exc
    budget.delete()
    return 204, None
