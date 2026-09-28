from ninja import Schema

from ledger.schemas import CategoryOut


class BudgetLimitIn(Schema):
    monthly_limit: str


class BudgetOut(Schema):
    category: CategoryOut
    monthly_limit: str


class BudgetProgressItemOut(Schema):
    category: CategoryOut
    monthly_limit: str
    spent: str
    over_limit: bool


class BudgetsSectionOut(Schema):
    month: str
    items: list[BudgetProgressItemOut]
