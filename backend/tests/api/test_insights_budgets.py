"""Insights budgets section (US4)."""

import pytest

from tests.conftest import csrf_put


def _category_id(client, *, name: str) -> int:
    for cat in client.get("/api/categories").json():
        if cat["side"] == "expense" and cat["name"] == name:
            return cat["id"]
    raise AssertionError("category not found")


@pytest.mark.django_db
def test_insights_includes_budgets_for_most_recent_month_in_period(api_client) -> None:
    groceries = _category_id(api_client, name="Groceries")
    csrf_put(api_client, f"/api/budgets/{groceries}", {"monthly_limit": "300.00"})

    response = api_client.get("/api/insights", {"from": "2026-07-01", "to": "2026-09-30"})
    data = response.json()
    assert data["budgets"]["month"] == "2026-09"
    assert len(data["budgets"]["items"]) == 1
    item = data["budgets"]["items"][0]
    assert item["monthly_limit"] == "300.00"
    assert "spent" in item
    assert "over_limit" in item
