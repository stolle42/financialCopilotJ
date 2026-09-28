"""API tests for import mapping profiles."""

import pytest

from tests.conftest import csrf_patch, csrf_post


def _profile_payload(**overrides):
    data = {
        "name": "Signed CSV",
        "date_column": "date",
        "amount_column": "amount",
        "debit_column": None,
        "credit_column": None,
        "description_column": "description",
        "counterparty_column": None,
        "date_format": "%Y-%m-%d",
        "decimal_separator": ".",
        "encoding": "utf-8",
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
def test_profile_crud(api_client) -> None:
    created = csrf_post(api_client, "/api/import/profiles", _profile_payload()).json()
    profile_id = created["id"]
    listed = api_client.get("/api/import/profiles").json()
    assert any(row["id"] == profile_id for row in listed)

    patched = csrf_patch(
        api_client,
        f"/api/import/profiles/{profile_id}",
        {"name": "Renamed"},
    ).json()
    assert patched["name"] == "Renamed"

    assert api_client.delete(f"/api/import/profiles/{profile_id}").status_code == 204


@pytest.mark.django_db
def test_profile_name_must_be_unique(api_client) -> None:
    csrf_post(api_client, "/api/import/profiles", _profile_payload(name="Unique"))
    response = csrf_post(
        api_client, "/api/import/profiles", _profile_payload(name="Unique")
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_profile_requires_exactly_one_amount_layout(api_client) -> None:
    bad = _profile_payload(
        amount_column="amount", debit_column="debit", credit_column="credit"
    )
    assert csrf_post(api_client, "/api/import/profiles", bad).status_code == 400

    missing = _profile_payload(
        amount_column=None, debit_column=None, credit_column=None
    )
    assert csrf_post(api_client, "/api/import/profiles", missing).status_code == 400

    split = _profile_payload(
        amount_column=None,
        debit_column="debit",
        credit_column="credit",
    )
    assert csrf_post(api_client, "/api/import/profiles", split).status_code == 200
