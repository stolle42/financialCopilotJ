from datetime import date

from ninja import Schema

from ledger.schemas import CategoryOut


class SpendingBucketOut(Schema):
    bucket: date
    amount: str


class BreakdownItemOut(Schema):
    category: CategoryOut
    amount: str
    share: str


class InsightsOut(Schema):
    spending_over_time: list[SpendingBucketOut]
    expense_breakdown: list[BreakdownItemOut]
    income_breakdown: list[BreakdownItemOut]
