"""API tests for transactions (US1)."""

import pytest

from tests.conftest import csrf_patch, csrf_post


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


def _category_id(
    client, *, side: str, name: str | None = None, protected: str | None = None
) -> int:
    for cat in client.get("/api/categories").json():
        if cat["side"] != side:
            continue
        if protected and cat.get("protected_role") == protected:
            return cat["id"]
        if name and cat["name"] == name:
            return cat["id"]
    raise AssertionError("category not found")


@pytest.mark.django_db
def test_create_expense_income_and_transfer(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    expense_cat = _category_id(api_client, side="expense", protected="uncategorised")
    income_cat = _category_id(api_client, side="income", protected="uncategorised")

    for kind, extra in (
        ("expense", {"category_id": expense_cat}),
        ("income", {"category_id": income_cat}),
        ("transfer", {"destination_account_id": checking}),
    ):
        payload = {
            "date": "2026-03-01",
            "amount": "1.00",
            "description": kind,
            "kind": kind,
            "account_id": cash,
            **extra,
        }
        response = csrf_post(api_client, "/api/transactions", payload)
        assert response.status_code == 200, response.content
        assert response.json()["kind"] == kind


@pytest.mark.django_db
def test_validation_errors(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    expense_uncat = _category_id(api_client, side="expense", protected="uncategorised")
    income_uncat = _category_id(api_client, side="income", protected="uncategorised")

    bad_cases = [
        {
            "date": "2026-01-01",
            "amount": "1.00",
            "description": "",
            "kind": "expense",
            "account_id": cash,
            "category_id": income_uncat,
        },
        {
            "date": "2026-01-01",
            "amount": "1.00",
            "description": "",
            "kind": "expense",
            "account_id": cash,
        },
        {
            "date": "2026-01-01",
            "amount": "1.00",
            "description": "",
            "kind": "transfer",
            "account_id": cash,
            "destination_account_id": checking,
            "category_id": expense_uncat,
        },
        {
            "date": "2026-01-01",
            "amount": "1.00",
            "description": "",
            "kind": "transfer",
            "account_id": cash,
            "destination_account_id": cash,
        },
        {
            "date": "2026-01-01",
            "amount": "-1.00",
            "description": "",
            "kind": "expense",
            "account_id": cash,
            "category_id": expense_uncat,
        },
    ]
    for payload in bad_cases:
        response = csrf_post(api_client, "/api/transactions", payload)
        assert response.status_code == 400, payload


@pytest.mark.django_db
def test_patch_kind_change_rules(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    expense_uncat = _category_id(api_client, side="expense", protected="uncategorised")
    income_uncat = _category_id(api_client, side="income", protected="uncategorised")

    created = csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-01-01",
            "amount": "5.00",
            "description": "",
            "kind": "expense",
            "account_id": cash,
            "category_id": expense_uncat,
        },
    ).json()
    tx_id = created["id"]

    to_income = csrf_patch(
        api_client,
        f"/api/transactions/{tx_id}",
        {"kind": "income"},
    )
    assert to_income.status_code == 200
    assert to_income.json()["category_id"] == income_uncat

    to_transfer = csrf_patch(
        api_client,
        f"/api/transactions/{tx_id}",
        {"kind": "transfer", "destination_account_id": checking},
    )
    assert to_transfer.status_code == 200
    body = to_transfer.json()
    assert body["category_id"] is None
    assert body["destination_account_id"] == checking


@pytest.mark.django_db
def test_delete_transaction(api_client) -> None:
    cash = _cash_id(api_client)
    cat = _category_id(api_client, side="expense", protected="uncategorised")
    tx = csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-01-01",
            "amount": "3.00",
            "description": "",
            "kind": "expense",
            "account_id": cash,
            "category_id": cat,
        },
    ).json()
    response = api_client.delete(f"/api/transactions/{tx['id']}")
    assert response.status_code == 204
    assert api_client.get("/api/transactions").json() == []


@pytest.mark.django_db
def test_list_filters_and_sort(api_client) -> None:
    cash = _cash_id(api_client)
    cat = _category_id(api_client, side="expense", name="Groceries")
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-01-01",
            "amount": "1.00",
            "description": "alpha",
            "kind": "expense",
            "account_id": cash,
            "category_id": cat,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-02-01",
            "amount": "2.00",
            "description": "beta shop",
            "kind": "expense",
            "account_id": cash,
            "category_id": cat,
        },
    )
    all_tx = api_client.get("/api/transactions").json()
    assert [t["date"] for t in all_tx] == ["2026-02-01", "2026-01-01"]

    filtered = api_client.get(
        "/api/transactions",
        {"from": "2026-02-01", "to": "2026-02-28", "q": "beta"},
    ).json()
    assert len(filtered) == 1
    assert filtered[0]["description"] == "beta shop"


@pytest.mark.django_db
def test_defaults_before_and_after_manual_entry(api_client) -> None:
    cash = _cash_id(api_client)
    expense_uncat = _category_id(api_client, side="expense", protected="uncategorised")
    income_uncat = _category_id(api_client, side="income", protected="uncategorised")

    defaults = api_client.get("/api/transactions/defaults").json()
    assert defaults["account_id"] == cash
    assert defaults["expense_category_id"] == expense_uncat
    assert defaults["income_category_id"] == income_uncat

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
            "amount": "0.00",
            "description": "",
            "kind": "expense",
            "account_id": checking,
            "category_id": expense_uncat,
        },
    )
    after = api_client.get("/api/transactions/defaults").json()
    assert after["account_id"] == checking
