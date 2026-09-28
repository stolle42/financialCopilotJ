from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction as db_transaction
from django.utils import timezone

from domain import ledger
from domain import reconciliation as domain_reconciliation
from ledger.models import (
    Account,
    Category,
    Kind,
    ManualEntryPreference,
    ProtectedRole,
    Side,
    Transaction,
)


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def account_balances() -> dict[int, Decimal]:
    """Return computed balance per account id."""
    balances: dict[int, Decimal] = {
        row["id"]: row["opening_balance"]
        for row in Account.objects.values("id", "opening_balance")
    }
    for row in Transaction.objects.values("account_id", "kind", "amount"):
        effect = ledger.signed_effect(row["kind"], row["amount"], is_destination=False)
        balances[row["account_id"]] = balances.get(row["account_id"], Decimal("0")) + effect
    for row in Transaction.objects.filter(kind=Kind.TRANSFER).values(
        "destination_account_id", "amount"
    ):
        dest_id = row["destination_account_id"]
        effect = ledger.signed_effect(
            Kind.TRANSFER, row["amount"], is_destination=True
        )
        balances[dest_id] = balances.get(dest_id, Decimal("0")) + effect
    return {account_id: _quantize(amount) for account_id, amount in balances.items()}


def _category_side(category_id: int | None) -> str | None:
    if category_id is None:
        return None
    return Category.objects.values_list("side", flat=True).get(pk=category_id)


def _uncategorised_for_side(side: str) -> Category:
    return Category.objects.get(side=side, protected_role="uncategorised")


def _unaccounted_for_side(side: str) -> Category:
    return Category.objects.get(side=side, protected_role=ProtectedRole.UNACCOUNTED)


def create_transaction(
    *,
    date,
    amount: Decimal,
    description: str,
    kind: str,
    account_id: int,
    category_id: int | None = None,
    destination_account_id: int | None = None,
    update_default_account: bool = True,
) -> Transaction:
    category_side = _category_side(category_id)
    ledger.validate(
        kind=kind,
        amount=amount,
        category_side=category_side,
        destination_account_id=destination_account_id,
        account_id=account_id,
    )
    if kind in (Kind.EXPENSE, Kind.INCOME) and category_side != kind:
        raise ledger.ValidationError("category side must match transaction kind")

    with db_transaction.atomic():
        tx = Transaction.objects.create(
            date=date,
            amount=amount,
            description=description,
            kind=kind,
            account_id=account_id,
            category_id=category_id,
            destination_account_id=destination_account_id,
        )
        if update_default_account:
            ManualEntryPreference.objects.update_or_create(
                id=1,
                defaults={"last_manual_entry_account_id": account_id},
            )
    return tx


def update_transaction(
    tx: Transaction,
    *,
    updates: dict[str, Any],
    update_default_account: bool = True,
) -> Transaction:
    kind = updates.get("kind", tx.kind)
    account_id = updates.get("account_id", tx.account_id)
    category_id = updates.get("category_id", tx.category_id)
    destination_account_id = updates.get(
        "destination_account_id", tx.destination_account_id
    )
    amount = updates.get("amount", tx.amount)

    if "kind" in updates and updates["kind"] != tx.kind:
        new_kind = updates["kind"]
        if new_kind == Kind.TRANSFER:
            category_id = None
            destination_account_id = updates.get(
                "destination_account_id", tx.destination_account_id
            )
        elif new_kind in (Kind.EXPENSE, Kind.INCOME):
            destination_account_id = None
            category_id = _uncategorised_for_side(new_kind).id
        kind = new_kind

    category_side = _category_side(category_id)
    ledger.validate(
        kind=kind,
        amount=amount,
        category_side=category_side,
        destination_account_id=destination_account_id,
        account_id=account_id,
    )

    with db_transaction.atomic():
        for field, value in (
            ("date", updates.get("date", tx.date)),
            ("amount", amount),
            ("description", updates.get("description", tx.description)),
            ("kind", kind),
            ("account_id", account_id),
            ("category_id", category_id),
            ("destination_account_id", destination_account_id),
        ):
            setattr(tx, field, value)
        tx.save()
        if update_default_account:
            ManualEntryPreference.objects.update_or_create(
                id=1,
                defaults={"last_manual_entry_account_id": account_id},
            )
    tx.refresh_from_db()
    return tx


def reconcile(account: Account, *, actual_balance: Decimal) -> tuple[Transaction | None, Decimal]:
    computed = account_balances()[account.id]
    today = timezone.localdate()
    entry = domain_reconciliation.reconciliation_entry(computed, actual_balance, today)
    if entry is None:
        return None, computed
    side = Side.EXPENSE if entry["kind"] == Kind.EXPENSE else Side.INCOME
    category = _unaccounted_for_side(side)
    tx = create_transaction(
        date=entry["date"],
        amount=entry["amount"],
        description=entry["description"],
        kind=entry["kind"],
        account_id=account.id,
        category_id=category.id,
        destination_account_id=None,
        update_default_account=False,
    )
    return tx, account_balances()[account.id]


def manual_entry_defaults() -> dict[str, int]:
    pref = ManualEntryPreference.objects.select_related("last_manual_entry_account").get(
        pk=1
    )
    expense_uncat = _uncategorised_for_side(Side.EXPENSE)
    income_uncat = _uncategorised_for_side(Side.INCOME)
    return {
        "account_id": pref.last_manual_entry_account_id,
        "expense_category_id": expense_uncat.id,
        "income_category_id": income_uncat.id,
    }
