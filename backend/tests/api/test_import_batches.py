"""API tests for import batches."""

from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from tests.conftest import csrf_patch, csrf_post

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def _cash_id(client) -> int:
    return client.get("/api/accounts").json()[0]["id"]


def _create_profile(client, **overrides):
    payload = {
        "name": "Import test",
        "date_column": "date",
        "amount_column": "amount",
        "debit_column": None,
        "credit_column": None,
        "description_column": "description",
        "counterparty_column": overrides.pop("counterparty_column", None),
        "date_format": "%Y-%m-%d",
        "decimal_separator": ".",
        "encoding": "utf-8",
    }
    payload.update(overrides)
    return csrf_post(client, "/api/import/profiles", payload).json()["id"]


def _upload(client, *, account_id: int, profile_id: int, path: Path, name: str | None = None):
    content = path.read_bytes()
    upload = SimpleUploadedFile(
        name or path.name,
        content,
        content_type="text/csv",
    )
    return client.post(
        "/api/import/batches",
        data={"account_id": account_id, "profile_id": profile_id, "file": upload},
        HTTP_X_CSRFTOKEN="test-csrf-token",
    )


@pytest.mark.django_db
def test_upload_creates_rows_without_changing_balances(api_client) -> None:
    cash = _cash_id(api_client)
    before = api_client.get("/api/accounts").json()[0]["balance"]
    profile_id = _create_profile(api_client, name="Signed")
    response = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "signed_comma.csv",
    )
    assert response.status_code == 200, response.content
    detail = response.json()
    assert detail["row_count"] == 3
    after = api_client.get("/api/accounts").json()[0]["balance"]
    assert after == before


@pytest.mark.django_db
def test_rows_start_in_uncategorised(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Uncat test")
    detail = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "signed_comma.csv",
    ).json()
    expense_uncat = next(
        cat["id"]
        for cat in api_client.get("/api/categories").json()
        if cat["side"] == "expense" and cat.get("protected_role") == "uncategorised"
    )
    for row in detail["ungrouped_rows"]:
        if row["parse_error"]:
            continue
        if row["kind"] == "expense":
            assert row["category_id"] == expense_uncat


@pytest.mark.django_db
def test_unparsable_and_duplicate_counts(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Parse test")
    detail = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "with_unparsable_rows.csv",
    ).json()
    assert detail["unparsable_count"] == 2
    assert len(detail["unparsable_rows"]) == 2
    assert detail["ungrouped_rows"][0]["include"] is True


@pytest.mark.django_db
def test_header_only_returns_400(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Header only")
    response = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "header_only.csv",
    )
    assert response.status_code == 400
    assert "no transactions" in response.json()["detail"].lower()


@pytest.mark.django_db
def test_confirm_creates_transactions_and_deletes_batch(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Confirm test")
    upload = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "signed_comma.csv",
    ).json()
    batch_id = upload["id"]
    created = csrf_post(api_client, f"/api/import/batches/{batch_id}/confirm", {}).json()
    assert created["created"] == 3
    assert api_client.get(f"/api/import/batches/{batch_id}").status_code == 404
    assert len(api_client.get("/api/transactions").json()) == 3


@pytest.mark.django_db
def test_reupload_flags_all_as_duplicates(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Dup test")
    path = FIXTURES / "signed_comma.csv"
    first = _upload(api_client, account_id=cash, profile_id=profile_id, path=path).json()
    csrf_post(api_client, f"/api/import/batches/{first['id']}/confirm", {})
    second = _upload(api_client, account_id=cash, profile_id=profile_id, path=path).json()
    assert second["duplicate_count"] == 3
    assert all(row["include"] is False for row in second["ungrouped_rows"])


@pytest.mark.django_db
def test_discard_removes_batch_without_ledger_changes(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Discard test")
    batch_id = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "signed_comma.csv",
    ).json()["id"]
    assert api_client.delete(f"/api/import/batches/{batch_id}").status_code == 204
    assert api_client.get("/api/transactions").json() == []


@pytest.mark.django_db
def test_patch_rows_and_transfer_validation(api_client) -> None:
    cash = _cash_id(api_client)
    profile_id = _create_profile(api_client, name="Patch test")
    detail = _upload(
        api_client,
        account_id=cash,
        profile_id=profile_id,
        path=FIXTURES / "signed_comma.csv",
    ).json()
    rows = detail["ungrouped_rows"]
    patches = [{"row_id": rows[0]["id"], "kind": "transfer"}]
    for row in rows[1:]:
        patches.append({"row_id": row["id"], "include": False})
    patched = csrf_patch(
        api_client,
        f"/api/import/batches/{detail['id']}/rows",
        patches,
    ).json()
    assert patched["ungrouped_rows"][0]["kind"] == "transfer"
    assert patched["ungrouped_rows"][1]["include"] is False
    bad_confirm = csrf_post(api_client, f"/api/import/batches/{detail['id']}/confirm", {})
    assert bad_confirm.status_code == 400
