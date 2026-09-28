"""Persistence of pending batches across clients (US2 scenario 12)."""

from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from tests.conftest import csrf_post

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


@pytest.mark.django_db
def test_batch_visible_from_second_client(api_client) -> None:
    cash = api_client.get("/api/accounts").json()[0]["id"]
    profile_id = csrf_post(
        api_client,
        "/api/import/profiles",
        {
            "name": "Persist profile",
            "date_column": "date",
            "amount_column": "amount",
            "description_column": "description",
            "date_format": "%Y-%m-%d",
            "decimal_separator": ".",
            "encoding": "utf-8",
        },
    ).json()["id"]
    upload = SimpleUploadedFile(
        "signed_comma.csv",
        (FIXTURES / "signed_comma.csv").read_bytes(),
        content_type="text/csv",
    )
    created = api_client.post(
        "/api/import/batches",
        data={"account_id": cash, "profile_id": profile_id, "file": upload},
        HTTP_X_CSRFTOKEN="test-csrf-token",
    ).json()

    other = Client()
    listed = other.get("/api/import/batches").json()
    assert any(row["id"] == created["id"] for row in listed)
    detail = other.get(f"/api/import/batches/{created['id']}").json()
    assert detail["row_count"] == created["row_count"]
