"""API tests for budgets (US4)."""

import pytest

from tests.conftest import csrf_delete, csrf_post, csrf_put


def _category_id(client, *, side: str, name: str | None = None, protected: str | None = None) -> int:
    for cat in client.get("/api/categories").json():
        if cat["side"] != side:
            continue
        if protected and cat.get("protected_role") == protected:
            return cat["id"]
        if name and cat["name"] == name:
            return cat["id"]
    raise AssertionError("category not found")


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


@pytest.mark.django_db
def test_put_creates_and_updates_budget(api_client) -> None:
    groceries = _category_id(api_client, side="expense", name="Groceries")
    created = csrf_put(
        api_client,
        f"/api/budgets/{groceries}",
        {"monthly_limit": "400.00"},
    )
    assert created.status_code == 200
    assert created.json()["monthly_limit"] == "400.00"

    updated = csrf_put(
        api_client,
        f"/api/budgets/{groceries}",
        {"monthly_limit": "350.00"},
    )
    assert updated.status_code == 200
    assert updated.json()["monthly_limit"] == "350.00"


@pytest.mark.django_db
def test_put_returns_409_for_income_and_protected_categories(api_client) -> None:
    salary = _category_id(api_client, side="income", name="Salary")
    uncat = _category_id(api_client, side="expense", protected="uncategorised")
    unaccounted = _category_id(api_client, side="expense", protected="unaccounted")

    for category_id in (salary, uncat, unaccounted):
        response = csrf_put(
            api_client,
            f"/api/budgets/{category_id}",
            {"monthly_limit": "100.00"},
        )
        assert response.status_code == 409


@pytest.mark.django_db
def test_delete_removes_budget(api_client) -> None:
    groceries = _category_id(api_client, side="expense", name="Groceries")
    csrf_put(api_client, f"/api/budgets/{groceries}", {"monthly_limit": "100.00"})
    deleted = csrf_delete(api_client, f"/api/budgets/{groceries}")
    assert deleted.status_code == 204
    assert api_client.get("/api/budgets", {"month": "2026-03"}).json() == []


@pytest.mark.django_db
def test_get_budgets_spent_for_month_excludes_transfers(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    groceries = _category_id(api_client, side="expense", name="Groceries")
    csrf_put(api_client, f"/api/budgets/{groceries}", {"monthly_limit": "500.00"})

    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-03-10",
            "amount": "25.00",
            "description": "shop",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-03-11",
            "amount": "99.00",
            "description": "xfer",
            "kind": "transfer",
            "account_id": cash,
            "destination_account_id": checking,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-04-01",
            "amount": "50.00",
            "description": "other month",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )

    rows = api_client.get("/api/budgets", {"month": "2026-03"}).json()
    groceries_row = next(row for row in rows if row["category"]["name"] == "Groceries")
    assert groceries_row["spent"] == "25.00"
    assert groceries_row["over_limit"] is False


@pytest.mark.django_db
def test_get_budgets_month_with_no_expenses_starts_at_zero(api_client) -> None:
    groceries = _category_id(api_client, side="expense", name="Groceries")
    csrf_put(api_client, f"/api/budgets/{groceries}", {"monthly_limit": "200.00"})
    rows = api_client.get("/api/budgets", {"month": "2030-06"}).json()
    assert rows[0]["spent"] == "0.00"
