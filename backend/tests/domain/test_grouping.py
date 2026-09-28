"""Domain tests for counterparty grouping."""

from dataclasses import dataclass

from domain import grouping


@dataclass
class Row:
    counterparty: str | None


def test_groups_only_when_at_least_two_share_counterparty() -> None:
    rows = [
        Row("ACME"),
        Row("ACME"),
        Row("Other"),
        Row(None),
    ]
    groups, ungrouped = grouping.group_by_counterparty(rows)
    assert len(groups) == 1
    assert groups[0].counterparty == "ACME"
    assert len(groups[0].rows) == 2
    assert len(ungrouped) == 2


def test_group_order_follows_first_appearance() -> None:
    rows = [Row("B"), Row("B"), Row("A"), Row("A")]
    groups, _ = grouping.group_by_counterparty(rows)
    assert [group.counterparty for group in groups] == ["B", "A"]
