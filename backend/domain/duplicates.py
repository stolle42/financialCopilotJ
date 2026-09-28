"""Duplicate detection for import rows (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class DuplicateCandidate:
    row_number: int
    account_id: int
    date: date
    amount: Decimal
    is_duplicate: bool = False


LedgerKey = tuple[int, date, Decimal]


def flag_duplicates(
    rows: list[DuplicateCandidate],
    existing_keys: set[LedgerKey],
    transfer_counter_keys: set[LedgerKey],
) -> list[DuplicateCandidate]:
    seen_in_batch: set[LedgerKey] = set()
    for row in rows:
        key = (row.account_id, row.date, row.amount)
        counter_key = (row.account_id, row.date, row.amount)
        if key in existing_keys or counter_key in transfer_counter_keys:
            row.is_duplicate = True
        elif key in seen_in_batch:
            row.is_duplicate = True
        else:
            row.is_duplicate = False
            seen_in_batch.add(key)
    return rows
