"""SPA catch-all and static serving (Phase 9 / R-7)."""

from pathlib import Path

import pytest
from django.conf import settings


def _dist_index() -> Path:
    return Path(settings.FRONTEND_DIST) / "index.html"


pytestmark = pytest.mark.skipif(
    not _dist_index().is_file(),
    reason="frontend/dist/index.html missing; run pnpm build in frontend/",
)


def _response_body(response) -> bytes:
    if hasattr(response, "content"):
        return response.content
    return b"".join(response.streaming_content)


@pytest.mark.django_db
def test_root_returns_index_html(api_client) -> None:
    response = api_client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("Content-Type", "")
    assert b"<" in _response_body(response)[:200]


@pytest.mark.django_db
def test_client_route_returns_index_html(api_client) -> None:
    response = api_client.get("/insights")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("Content-Type", "")
    assert _response_body(response) == _dist_index().read_bytes()


@pytest.mark.django_db
def test_unknown_api_route_returns_json_404(api_client) -> None:
    response = api_client.get("/api/unknown")
    assert response.status_code == 404
    assert response.headers.get("Content-Type", "").startswith("application/json")
    assert "detail" in response.json()
