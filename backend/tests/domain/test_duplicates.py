"""Domain tests for duplicate flagging."""

from datetime import date
from decimal import Decimal

from domain import duplicates


def test_flags_second_identical_row_in_batch() -> None:
    rows = [
        duplicates.DuplicateCandidate(1, 1, date(2026, 1, 1), Decimal("1.00")),
        duplicates.DuplicateCandidate(2, 1, date(2026, 1, 1), Decimal("1.00")),
    ]
    flagged = duplicates.flag_duplicates(rows, set(), set())
    assert flagged[0].is_duplicate is False
    assert flagged[1].is_duplicate is True


def test_flags_existing_ledger_key_regardless_of_description() -> None:
    rows = [duplicates.DuplicateCandidate(1, 1, date(2026, 1, 1), Decimal("5.00"))]
    existing = {(1, date(2026, 1, 1), Decimal("5.00"))}
    flagged = duplicates.flag_duplicates(rows, existing, set())
    assert flagged[0].is_duplicate is True


def test_flags_transfer_counter_account_match() -> None:
    rows = [duplicates.DuplicateCandidate(1, 2, date(2026, 2, 1), Decimal("100.00"))]
    transfer_keys = {(2, date(2026, 2, 1), Decimal("100.00"))}
    flagged = duplicates.flag_duplicates(rows, set(), transfer_keys)
    assert flagged[0].is_duplicate is True
