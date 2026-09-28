"""Shared pytest configuration for the backend test suite."""

import pytest
from django.test import Client


@pytest.fixture
def api_client(db) -> Client:
    """Django test client with CSRF cookie and header wired for Ninja API mutations."""
    client = Client()
    client.cookies["csrftoken"] = "test-csrf-token"
    client.defaults["HTTP_X_CSRFTOKEN"] = "test-csrf-token"
    return client


def csrf_post(client: Client, path: str, data, content_type="application/json"):
    import json

    body = json.dumps(data) if content_type == "application/json" else data
    return client.post(path, body, content_type=content_type)


def csrf_patch(client: Client, path: str, data):
    import json

    return client.patch(
        path,
        json.dumps(data),
        content_type="application/json",
    )
