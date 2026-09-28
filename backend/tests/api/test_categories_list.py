"""API tests for category list and seed data (US1)."""

import pytest


@pytest.mark.django_db
def test_categories_list_includes_both_sides_with_protected_pair(api_client) -> None:
    response = api_client.get("/api/categories")
    assert response.status_code == 200
    categories = response.json()
    expense = [c for c in categories if c["side"] == "expense"]
    income = [c for c in categories if c["side"] == "income"]
    assert len(expense) >= 2
    assert len(income) >= 2
    for side_rows in (expense, income):
        roles = {c["protected_role"] for c in side_rows if c["protected_role"]}
        assert roles == {"uncategorised", "unaccounted"}
