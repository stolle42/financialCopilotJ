"""Vendor grouping for import review (pure Python)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TypeVar

T = TypeVar("T")


@dataclass
class CounterpartyGroup:
    counterparty: str
    rows: list


def group_by_counterparty(rows: list[T]) -> tuple[list[CounterpartyGroup], list[T]]:
    buckets: dict[str, list[T]] = {}
    order: list[str] = []
    ungrouped: list[T] = []

    for row in rows:
        counterparty = getattr(row, "counterparty", None)
        if not counterparty:
            ungrouped.append(row)
            continue
        if counterparty not in buckets:
            buckets[counterparty] = []
            order.append(counterparty)
        buckets[counterparty].append(row)

    groups: list[CounterpartyGroup] = []
    for name in order:
        members = buckets[name]
        if len(members) >= 2:
            groups.append(CounterpartyGroup(counterparty=name, rows=list(members)))
        else:
            ungrouped.extend(members)

    return groups, ungrouped
