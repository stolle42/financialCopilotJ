"""API tests for insights (US3)."""

import time
from datetime import date, timedelta
from decimal import Decimal

import pytest

from ledger.models import Account, Category, Kind, Transaction
from tests.conftest import csrf_post


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


def _category_id(client, *, side: str, protected: str | None = None) -> int:
    for cat in client.get("/api/categories").json():
        if cat["side"] != side:
            continue
        if protected and cat.get("protected_role") == protected:
            return cat["id"]
    raise AssertionError("category not found")


@pytest.mark.django_db
def test_insights_counts_only_transactions_in_period_excludes_transfers(api_client) -> None:
    cash = _cash_id(api_client)
    checking = csrf_post(
        api_client,
        "/api/accounts",
        {"name": "Checking", "type": "checking", "opening_balance": "0.00"},
    ).json()["id"]
    groceries = next(
        cat["id"]
        for cat in api_client.get("/api/categories").json()
        if cat["side"] == "expense" and cat["name"] == "Groceries"
    )
    expense_uncat = _category_id(api_client, side="expense", protected="uncategorised")

    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-03-05",
            "amount": "10.00",
            "description": "in range",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-04-01",
            "amount": "99.00",
            "description": "outside",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-03-06",
            "amount": "50.00",
            "description": "transfer",
            "kind": "transfer",
            "account_id": cash,
            "destination_account_id": checking,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-03-07",
            "amount": "5.00",
            "description": "uncat",
            "kind": "expense",
            "account_id": cash,
            "category_id": expense_uncat,
        },
    )

    response = api_client.get("/api/insights", {"from": "2026-03-01", "to": "2026-03-31"})
    assert response.status_code == 200
    data = response.json()
    assert "budgets" not in data
    assert sum(float(row["amount"]) for row in data["spending_over_time"]) == 15.0
    names = {row["category"]["name"] for row in data["expense_breakdown"]}
    assert "Groceries" in names


@pytest.mark.django_db
def test_insights_shows_unaccounted_from_reconciliation_like_entries(api_client) -> None:
    cash = _cash_id(api_client)
    expense_unaccounted = _category_id(api_client, side="expense", protected="unaccounted")
    income_unaccounted = _category_id(api_client, side="income", protected="unaccounted")

    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-05-10",
            "amount": "20.00",
            "description": "Reconciliation",
            "kind": "expense",
            "account_id": cash,
            "category_id": expense_unaccounted,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-05-11",
            "amount": "7.00",
            "description": "Reconciliation",
            "kind": "income",
            "account_id": cash,
            "category_id": income_unaccounted,
        },
    )

    response = api_client.get("/api/insights", {"from": "2026-05-01", "to": "2026-05-31"})
    data = response.json()
    expense_names = {row["category"]["name"] for row in data["expense_breakdown"]}
    income_names = {row["category"]["name"] for row in data["income_breakdown"]}
    assert "Unaccounted" in expense_names
    assert "Unaccounted" in income_names


@pytest.mark.django_db
def test_insights_empty_period_returns_empty_arrays(api_client) -> None:
    response = api_client.get("/api/insights", {"from": "2030-01-01", "to": "2030-01-31"})
    data = response.json()
    assert data["spending_over_time"] == []
    assert data["expense_breakdown"] == []
    assert data["income_breakdown"] == []


@pytest.mark.django_db
def test_insights_defaults_to_current_calendar_month(api_client, monkeypatch) -> None:
    monkeypatch.setattr(
        "insights.api.timezone.localdate",
        lambda: date(2026, 7, 15),
    )
    cash = _cash_id(api_client)
    groceries = next(
        cat["id"]
        for cat in api_client.get("/api/categories").json()
        if cat["side"] == "expense" and cat["name"] == "Groceries"
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-07-02",
            "amount": "3.00",
            "description": "july",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )
    csrf_post(
        api_client,
        "/api/transactions",
        {
            "date": "2026-06-30",
            "amount": "99.00",
            "description": "june",
            "kind": "expense",
            "account_id": cash,
            "category_id": groceries,
        },
    )

    response = api_client.get("/api/insights")
    data = response.json()
    assert sum(float(row["amount"]) for row in data["spending_over_time"]) == 3.0


@pytest.mark.django_db
def test_insights_performance_with_five_thousand_transactions(api_client) -> None:
    cash = Account.objects.get(name="Cash")
    groceries = Category.objects.get(side="expense", name="Groceries")
    Transaction.objects.bulk_create(
        [
            Transaction(
                date=date(2026, 1, 1) + timedelta(days=i % 28),
                amount=Decimal("1.00"),
                description=f"bulk-{i}",
                kind=Kind.EXPENSE,
                account_id=cash.id,
                category_id=groceries.id,
            )
            for i in range(5000)
        ]
    )
    start = time.perf_counter()
    response = api_client.get("/api/insights", {"from": "2026-01-01", "to": "2026-01-31"})
    elapsed = time.perf_counter() - start
    assert response.status_code == 200
    assert elapsed < 2.0
