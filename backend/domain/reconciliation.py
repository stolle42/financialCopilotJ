"""Pure-Python reconciliation rules (US5)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any


def reconciliation_entry(
    computed: Decimal,
    actual: Decimal,
    posted_on: date,
) -> dict[str, Any] | None:
    computed = computed.quantize(Decimal("0.01"))
    actual = actual.quantize(Decimal("0.01"))
    if computed == actual:
        return None
    difference = abs(computed - actual).quantize(Decimal("0.01"))
    kind = "expense" if actual < computed else "income"
    return {
        "kind": kind,
        "amount": difference,
        "date": posted_on,
        "description": "Reconciliation",
    }
