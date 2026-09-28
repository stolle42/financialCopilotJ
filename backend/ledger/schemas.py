from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Literal

from ninja import Field, Schema
from pydantic import field_validator


def _decimal_string(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")), "f")


class AccountOut(Schema):
    id: int
    name: str
    type: str
    opening_balance: str

    @staticmethod
    def resolve_opening_balance(obj) -> str:
        return _decimal_string(obj.opening_balance)


class AccountWithBalanceOut(Schema):
    id: int
    name: str
    type: str
    opening_balance: str
    balance: str


class AccountIn(Schema):
    name: str
    type: str
    opening_balance: str = "0.00"


class AccountPatchIn(Schema):
    name: str | None = None
    type: str | None = None
    opening_balance: str | None = None


class CategoryOut(Schema):
    id: int
    name: str
    colour: str
    side: str
    protected_role: str | None


class TransactionOut(Schema):
    id: int
    date: datetime.date
    amount: str
    description: str
    kind: str
    account_id: int
    category_id: int | None
    destination_account_id: int | None

    @staticmethod
    def resolve_amount(obj) -> str:
        return _decimal_string(obj.amount)


class TransactionIn(Schema):
    posted_on: datetime.date = Field(..., validation_alias="date")
    amount: str
    description: str = ""
    kind: Literal["expense", "income", "transfer"]
    account_id: int
    category_id: int | None = None
    destination_account_id: int | None = None

    @field_validator("amount")
    @classmethod
    def parse_amount(cls, value: str) -> str:
        dec = Decimal(value)
        return _decimal_string(dec)


class TransactionPatchIn(Schema):
    posted_on: datetime.date | None = Field(None, validation_alias="date")
    amount: str | None = None
    description: str | None = None
    kind: Literal["expense", "income", "transfer"] | None = None
    account_id: int | None = None
    category_id: int | None = None
    destination_account_id: int | None = None


class ManualEntryDefaultsOut(Schema):
    account_id: int
    expense_category_id: int
    income_category_id: int
