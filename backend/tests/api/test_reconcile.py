"""API tests for account reconciliation (US5)."""

from datetime import date

import pytest

from ledger.models import Transaction
from tests.conftest import csrf_post


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


def _category_id(client, *, side: str, protected: str) -> int:
    for cat in client.get("/api/categories").json():
        if cat["side"] == side and cat.get("protected_role") == protected:
            return cat["id"]
    raise AssertionError("category not found")


@pytest.mark.django_db
def test_reconcile_lower_balance_books_expense_unaccounted(
    api_client, monkeypatch
) -> None:
    monkeypatch.setattr(
        "ledger.services.timezone.localdate",
        lambda: date(2026, 5, 20),
    )
    cash = _cash_id(api_client)
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-05-01",
            "amount": "100.00",
            "description": "seed",
            "kind": "income",
            "account_id": cash,
            "category_id": next(
                c["id"]
                for c in api_client.get("/api/categories").json()
                if c["side"] == "income" and c["name"] == "Salary"
            ),
        },
    )

    response = csrf_post(
        api_client,
        f"/api/accounts/{cash}/reconcile",
        {"actual_balance": "85.00"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["balance"] == "85.00"
    tx = body["transaction"]
    assert tx["kind"] == "expense"
    assert tx["amount"] == "15.00"
    assert tx["description"] == "Reconciliation"
    assert tx["date"] == "2026-05-20"
    expense_unaccounted = _category_id(
        api_client, side="expense", protected="unaccounted"
    )
    assert tx["category_id"] == expense_unaccounted


@pytest.mark.django_db
def test_reconcile_higher_balance_books_income_unaccounted(
    api_client, monkeypatch
) -> None:
    monkeypatch.setattr(
        "ledger.services.timezone.localdate",
        lambda: date(2026, 5, 21),
    )
    cash = _cash_id(api_client)
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-05-01",
            "amount": "100.00",
            "description": "seed",
            "kind": "income",
            "account_id": cash,
            "category_id": next(
                c["id"]
                for c in api_client.get("/api/categories").json()
                if c["side"] == "income" and c["name"] == "Salary"
            ),
        },
    )
    response = csrf_post(
        api_client,
        f"/api/accounts/{cash}/reconcile",
        {"actual_balance": "120.00"},
    )
    tx = response.json()["transaction"]
    assert tx["kind"] == "income"
    assert tx["amount"] == "20.00"
    income_unaccounted = _category_id(
        api_client, side="income", protected="unaccounted"
    )
    assert tx["category_id"] == income_unaccounted


@pytest.mark.django_db
def test_reconcile_equal_balances_returns_null_transaction(api_client) -> None:
    cash = _cash_id(api_client)
    response = csrf_post(
        api_client,
        f"/api/accounts/{cash}/reconcile",
        {"actual_balance": "0.00"},
    )
    assert response.status_code == 200
    assert response.json()["transaction"] is None
    assert response.json()["balance"] == "0.00"


@pytest.mark.django_db
def test_reconcile_works_on_savings_account(api_client) -> None:
    created = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Rainy day", "type": "savings", "opening_balance": "50.00"},
    ).json()
    response = csrf_post(
        api_client,
        f"/api/accounts/{created['id']}/reconcile",
        {"actual_balance": "50.00"},
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_reconcile_does_not_change_manual_entry_default_account(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    groceries = next(
        c["id"]
        for c in api_client.get("/api/categories").json()
        if c["side"] == "expense" and c["name"] == "Groceries"
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-06-01",
            "amount": "1.00",
            "description": "manual",
            "kind": "expense",
            "account_id": checking,
            "category_id": groceries,
        },
    )
    assert api_client.get("/api/transactions/defaults").json()["account_id"] == checking

    csrf_post(
        api_client,
        f"/api/accounts/{cash}/reconcile",
        {"actual_balance": "0.00"},
    )
    assert api_client.get("/api/transactions/defaults").json()["account_id"] == checking
    assert (
        Transaction.objects.filter(
            account_id=cash, description="Reconciliation"
        ).count()
        == 0
    )
