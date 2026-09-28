from __future__ import annotations

import datetime
from decimal import Decimal

from ninja import Schema


def _money(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(value.quantize(Decimal("0.01")), "f")


class MappingProfileOut(Schema):
    id: int
    name: str
    date_column: str
    amount_column: str | None
    debit_column: str | None
    credit_column: str | None
    description_column: str
    counterparty_column: str | None
    date_format: str
    decimal_separator: str
    encoding: str


class MappingProfileIn(Schema):
    name: str
    date_column: str
    amount_column: str | None = None
    debit_column: str | None = None
    credit_column: str | None = None
    description_column: str
    counterparty_column: str | None = None
    date_format: str
    decimal_separator: str
    encoding: str = "utf-8"


class MappingProfilePatchIn(Schema):
    name: str | None = None
    date_column: str | None = None
    amount_column: str | None = None
    debit_column: str | None = None
    credit_column: str | None = None
    description_column: str | None = None
    counterparty_column: str | None = None
    date_format: str | None = None
    decimal_separator: str | None = None
    encoding: str | None = None


class PendingRowOut(Schema):
    id: int
    row_number: int
    raw_line: str
    parse_error: str | None
    date: datetime.date | None
    amount: str | None = None
    description: str
    counterparty: str | None
    kind: str
    category_id: int | None
    destination_account_id: int | None
    is_duplicate: bool
    include: bool


class VendorGroupOut(Schema):
    counterparty: str
    rows: list[PendingRowOut]


class PendingBatchSummaryOut(Schema):
    id: int
    account_id: int
    profile_id: int
    source_filename: str
    created_at: datetime.datetime
    row_count: int
    unparsable_count: int
    duplicate_count: int


class PendingBatchDetailOut(PendingBatchSummaryOut):
    groups: list[VendorGroupOut]
    ungrouped_rows: list[PendingRowOut]
    unparsable_rows: list[PendingRowOut]


class PendingRowPatchIn(Schema):
    row_id: int
    category_id: int | None = None
    kind: str | None = None
    destination_account_id: int | None = None
    include: bool | None = None


class ConfirmOut(Schema):
    created: int
