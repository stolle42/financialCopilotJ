"""API tests for accounts (US1; reconcile deferred to US5)."""

import pytest

from tests.conftest import csrf_patch, csrf_post


@pytest.mark.django_db
def test_fresh_database_lists_seeded_cash_with_zero_balance(api_client) -> None:
    response = api_client.get("/api/accounts")
    assert response.status_code == 200
    accounts = response.json()
    assert len(accounts) == 1
    assert accounts[0]["name"] == "Cash"
    assert accounts[0]["type"] == "cash"
    assert accounts[0]["balance"] == "0.00"


@pytest.mark.django_db
def test_create_account_returns_balance_equal_to_opening(api_client) -> None:
    response = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "100.50"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Checking"
    assert body["opening_balance"] == "100.50"
    assert body["balance"] == "100.50"


@pytest.mark.django_db
def test_duplicate_account_name_returns_400(api_client) -> None:
    csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    )
    response = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "savings", "opening_balance": "0.00"},
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_patch_opening_balance_updates_balance_without_transaction(api_client) -> None:
    create = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "10.00"},
    )
    account_id = create.json()["id"]
    patch = csrf_patch(
        api_client,
        f"/api/accounts/{account_id}",
        {"opening_balance": "25.00"},
    )
    assert patch.status_code == 200
    assert patch.json()["balance"] == "25.00"
    tx_list = api_client.get("/api/transactions")
    assert tx_list.json() == []


@pytest.mark.django_db
def test_transfer_updates_both_account_balances(api_client) -> None:
    cash = api_client.get("/api/accounts").json()[0]["id"]
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-01-01",
            "amount": "50.00",
            "description": "",
            "kind": "income",
            "account_id": cash,
            "category_id": _income_category_id(api_client, "Salary"),
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-01-02",
            "amount": "30.00",
            "description": "move",
            "kind": "transfer",
            "account_id": cash,
            "destination_account_id": checking,
        },
    )
    accounts = {a["name"]: a["balance"] for a in api_client.get("/api/accounts").json()}
    assert accounts["Cash"] == "20.00"
    assert accounts["Checking"] == "30.00"


def _income_category_id(client, name: str) -> int:
    categories = client.get("/api/categories").json()
    for cat in categories:
        if cat["side"] == "income" and cat["name"] == name:
            return cat["id"]
    raise AssertionError(f"category {name!r} not found")
