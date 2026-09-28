"""API tests for category mutations (US6)."""

from decimal import Decimal

import pytest
from django.utils import timezone

from budgets.models import Budget
from imports.models import MappingProfile, PendingBatch, PendingRow
from ledger.models import Category, Kind, Transaction
from tests.conftest import csrf_delete, csrf_patch, csrf_post, csrf_put


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


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


@pytest.mark.django_db
def test_create_category_on_either_side(api_client) -> None:
    created = csrf_post(
        api_client,
        "/api/categories",
        {
            "name": "Pets",
            "colour": "#aabbcc",
            "side": "expense",
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["name"] == "Pets"
    assert body["side"] == "expense"
    assert body["protected_role"] is None


@pytest.mark.django_db
def test_same_name_on_both_sides_allowed(api_client) -> None:
    csrf_post(
        api_client,
        "/api/categories",
        {"name": "SideTest", "colour": "#111111", "side": "expense"},
    )
    income = csrf_post(
        api_client,
        "/api/categories",
        {"name": "SideTest", "colour": "#222222", "side": "income"},
    )
    assert income.status_code == 200
    assert income.json()["side"] == "income"


@pytest.mark.django_db
def test_duplicate_name_on_same_side_returns_400(api_client) -> None:
    csrf_post(
        api_client,
        "/api/categories",
        {
            "name": "Refunds",
            "colour": "#111111",
            "side": "expense",
        },
    )
    again = csrf_post(
        api_client,
        "/api/categories",
        {"name": "Refunds", "colour": "#333333", "side": "expense"},
    )
    assert again.status_code == 400
    assert "unique" in again.json()["detail"].lower()


@pytest.mark.django_db
def test_patch_name_and_colour(api_client) -> None:
    created = csrf_post(
        api_client,
        "/api/categories",
        {"name": "Tea shop", "colour": "#aaaaaa", "side": "expense"},
    ).json()
    updated = csrf_patch(
        api_client,
        f"/api/categories/{created['id']}",
        {"name": "Restaurants", "colour": "#bbbbbb"},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["name"] == "Restaurants"
    assert body["colour"] == "#bbbbbb"


@pytest.mark.django_db
def test_patch_protected_category_name_and_colour(api_client) -> None:
    uncat = _category_id(api_client, side="expense", protected="uncategorised")
    updated = csrf_patch(
        api_client,
        f"/api/categories/{uncat}",
        {"name": "Misc", "colour": "#cccccc"},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["name"] == "Misc"
    assert body["colour"] == "#cccccc"
    assert body["protected_role"] == "uncategorised"


@pytest.mark.django_db
def test_delete_protected_category_returns_409(api_client) -> None:
    for protected in ("uncategorised", "unaccounted"):
        for side in ("expense", "income"):
            category_id = _category_id(api_client, side=side, protected=protected)
            response = csrf_delete(api_client, f"/api/categories/{category_id}")
            assert response.status_code == 409
            assert "protected" in response.json()["detail"].lower()


@pytest.mark.django_db
def test_delete_category_reassigns_transactions_pending_rows_and_removes_budget(
    api_client,
) -> None:
    cash = _cash_id(api_client)
    restaurants = csrf_post(
        api_client,
        "/api/categories",
        {"name": "Restaurants", "colour": "#123456", "side": "expense"},
    ).json()["id"]
    uncat = _category_id(api_client, side="expense", protected="uncategorised")

    for _ in range(3):
        csrf_post(
            api_client,
            "/api/transactions",
            {
                "date": "2026-03-01",
                "amount": "10.00",
                "description": "meal",
                "kind": "expense",
                "account_id": cash,
                "category_id": restaurants,
            },
        )

    csrf_put(api_client, f"/api/budgets/{restaurants}", {"monthly_limit": "200.00"})

    profile = MappingProfile.objects.create(
        name="Test profile",
        date_column="Date",
        amount_column="Amount",
        description_column="Desc",
        date_format="%Y-%m-%d",
        decimal_separator=".",
        encoding="utf-8",
    )
    batch = PendingBatch.objects.create(
        account_id=cash,
        profile=profile,
        source_filename="test.csv",
    )
    PendingRow.objects.create(
        batch=batch,
        row_number=1,
        raw_line="x",
        date=timezone.localdate(),
        amount=Decimal("5.00"),
        description="pending",
        kind=Kind.EXPENSE,
        category_id=restaurants,
    )

    deleted = csrf_delete(api_client, f"/api/categories/{restaurants}")
    assert deleted.status_code == 204
    assert not Category.objects.filter(pk=restaurants).exists()
    assert Budget.objects.filter(category_id=restaurants).count() == 0

    tx_categories = Transaction.objects.values_list("category_id", flat=True)
    assert set(tx_categories) == {uncat}

    pending = PendingRow.objects.get(batch=batch)
    assert pending.category_id == uncat
