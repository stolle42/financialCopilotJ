from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction as db_transaction

from domain import csv_import, duplicates, grouping
from domain.csv_import import CsvMappingProfile
from imports.models import MappingProfile, PendingBatch, PendingRow
from ledger.models import Category, Kind, Side, Transaction
from ledger.services import _uncategorised_for_side, create_transaction


class ImportError(ValueError):
    """Raised when an import cannot be created."""


def profile_to_domain(profile: MappingProfile) -> CsvMappingProfile:
    return CsvMappingProfile(
        date_column=profile.date_column,
        amount_column=profile.amount_column,
        debit_column=profile.debit_column,
        credit_column=profile.credit_column,
        description_column=profile.description_column,
        counterparty_column=profile.counterparty_column,
        date_format=profile.date_format,
        decimal_separator=profile.decimal_separator,
        encoding=profile.encoding,
    )


def _ledger_keys(account_id: int) -> tuple[set, set]:
    existing: set[tuple[int, Any, Decimal]] = set()
    transfer_counter: set[tuple[int, Any, Decimal]] = set()
    for row in Transaction.objects.filter(account_id=account_id).values(
        "date", "amount"
    ):
        existing.add((account_id, row["date"], row["amount"]))
    for row in Transaction.objects.filter(
        kind=Kind.TRANSFER, destination_account_id=account_id
    ).values("date", "amount"):
        transfer_counter.add((account_id, row["date"], row["amount"]))
    return existing, transfer_counter


def create_batch(
    *,
    file_bytes: bytes,
    filename: str,
    account_id: int,
    profile: MappingProfile,
) -> PendingBatch:
    domain_profile = profile_to_domain(profile)
    text = csv_import.decode_bytes(file_bytes, domain_profile)
    parsed_rows = csv_import.parse_rows(text, domain_profile)
    if not parsed_rows:
        raise ImportError("no transactions")

    existing_keys, transfer_keys = _ledger_keys(account_id)
    candidates: list[duplicates.DuplicateCandidate] = []

    with db_transaction.atomic():
        batch = PendingBatch.objects.create(
            account_id=account_id,
            profile=profile,
            source_filename=filename,
        )
        pending_rows: list[PendingRow] = []
        for parsed in parsed_rows:
            if parsed.parse_error:
                pending_rows.append(
                    PendingRow(
                        batch=batch,
                        row_number=parsed.row_number,
                        raw_line=parsed.raw_line,
                        parse_error=parsed.parse_error,
                        description=parsed.description,
                        counterparty=parsed.counterparty,
                        kind=Kind.EXPENSE,
                        include=False,
                        is_duplicate=False,
                    )
                )
                continue

            candidates.append(
                duplicates.DuplicateCandidate(
                    row_number=parsed.row_number,
                    account_id=account_id,
                    date=parsed.date,
                    amount=parsed.amount,
                )
            )

        if not candidates:
            raise ImportError("no transactions")

        duplicates.flag_duplicates(candidates, existing_keys, transfer_keys)
        duplicate_by_row = {item.row_number: item.is_duplicate for item in candidates}

        for parsed in parsed_rows:
            if parsed.parse_error:
                continue
            kind = parsed.proposed_kind or Kind.EXPENSE
            category = None
            if kind in (Kind.EXPENSE, Kind.INCOME):
                category = _uncategorised_for_side(
                    Side.EXPENSE if kind == Kind.EXPENSE else Side.INCOME
                )
            is_dup = duplicate_by_row.get(parsed.row_number, False)
            pending_rows.append(
                PendingRow(
                    batch=batch,
                    row_number=parsed.row_number,
                    raw_line=parsed.raw_line,
                    date=parsed.date,
                    amount=parsed.amount,
                    description=parsed.description,
                    counterparty=parsed.counterparty,
                    kind=kind,
                    category=category,
                    is_duplicate=is_dup,
                    include=not is_dup,
                )
            )

        PendingRow.objects.bulk_create(pending_rows)
    return batch


def batch_row_queryset(batch: PendingBatch):
    return batch.rows.select_related("category", "destination_account").order_by(
        "row_number"
    )


def batch_detail(batch: PendingBatch) -> dict[str, Any]:
    rows = list(batch_row_queryset(batch))
    parsable = [row for row in rows if not row.parse_error]
    unparsable = [row for row in rows if row.parse_error]
    groups, ungrouped = grouping.group_by_counterparty(parsable)
    return {
        "batch": batch,
        "groups": groups,
        "ungrouped_rows": ungrouped,
        "unparsable_rows": unparsable,
    }


def update_rows(batch: PendingBatch, patches: list[dict[str, Any]]) -> PendingBatch:
    rows_by_id = {row.id: row for row in batch.rows.all()}
    for patch in patches:
        row = rows_by_id.get(patch["row_id"])
        if row is None or row.parse_error:
            continue
        if "kind" in patch:
            row.kind = patch["kind"]
            if row.kind == Kind.TRANSFER:
                row.category = None
            elif row.kind in (Kind.EXPENSE, Kind.INCOME):
                row.destination_account_id = None
                row.category = _uncategorised_for_side(
                    Side.EXPENSE if row.kind == Kind.EXPENSE else Side.INCOME
                )
        if "category_id" in patch and row.kind != Kind.TRANSFER:
            row.category_id = patch["category_id"]
        if "destination_account_id" in patch:
            row.destination_account_id = patch["destination_account_id"]
        if "include" in patch and not row.parse_error:
            row.include = bool(patch["include"])
        row.save()
    return batch


def confirm_batch(batch: PendingBatch) -> int:
    rows = list(batch.rows.filter(include=True))
    for row in rows:
        if row.parse_error:
            raise ImportError("included row is unparsable")
        if row.kind == Kind.TRANSFER and row.destination_account_id is None:
            raise ImportError("transfer missing destination")
        if row.kind in (Kind.EXPENSE, Kind.INCOME) and not row.category_id:
            raise ImportError("missing category")

    created = 0
    with db_transaction.atomic():
        for row in rows:
            create_transaction(
                date=row.date,
                amount=row.amount,
                description=row.description,
                kind=row.kind,
                account_id=batch.account_id,
                category_id=row.category_id,
                destination_account_id=row.destination_account_id,
                update_default_account=False,
            )
            created += 1
        batch.delete()
    return created


def discard_batch(batch: PendingBatch) -> None:
    batch.delete()
