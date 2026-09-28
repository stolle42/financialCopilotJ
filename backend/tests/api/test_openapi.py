import pytest
from django.test import Client


@pytest.mark.django_db
def test_openapi_json_is_served(client) -> None:
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "paths" in data


@pytest.mark.django_db
def test_ninja_post_without_csrf_token_is_rejected() -> None:
    client = Client(enforce_csrf_checks=True)
    response = client.post(
        "/api/_csrf_probe",
        data="{}",
        content_type="application/json",
    )
    assert response.status_code == 403
