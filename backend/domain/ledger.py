"""Pure-Python ledger rules (no Django imports)."""

from __future__ import annotations

from collections.abc import Iterable
from decimal import Decimal


class ValidationError(ValueError):
    """Raised when transaction fields violate domain rules."""


def signed_effect(
    kind: str, amount: Decimal, *, is_destination: bool = False
) -> Decimal:
    if kind == "expense":
        return -amount
    if kind == "income":
        return amount
    if kind == "transfer":
        return amount if is_destination else -amount
    raise ValidationError(f"unknown kind: {kind!r}")


def compute_balance(opening: Decimal, effects: Iterable[Decimal]) -> Decimal:
    total = opening
    for effect in effects:
        total += effect
    return total


def validate(
    *,
    kind: str,
    amount: Decimal,
    category_side: str | None,
    destination_account_id: int | None,
    account_id: int,
) -> None:
    if amount < 0:
        raise ValidationError("amount must not be negative")

    if kind in ("expense", "income"):
        expected_side = kind
        if category_side != expected_side:
            raise ValidationError("category side must match transaction kind")
        if destination_account_id is not None:
            raise ValidationError("destination is only allowed for transfers")
        return

    if kind == "transfer":
        if category_side is not None:
            raise ValidationError("transfers must not have a category")
        if destination_account_id is None:
            raise ValidationError("transfer requires a destination account")
        if destination_account_id == account_id:
            raise ValidationError("destination must differ from source account")
        return

    raise ValidationError(f"unknown kind: {kind!r}")
