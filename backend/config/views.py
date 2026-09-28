from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpRequest, JsonResponse
from django.views.defaults import page_not_found as django_page_not_found


def _frontend_dist() -> Path:
    return Path(settings.FRONTEND_DIST)


def _safe_file(dist: Path, subpath: str) -> Path | None:
    if subpath in ("", "/"):
        index = dist / "index.html"
        return index if index.is_file() else None
    candidate = (dist / subpath).resolve()
    try:
        candidate.relative_to(dist.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def spa_index(request: HttpRequest, path: str = "") -> FileResponse:
    """Serve the Vite build; unknown client routes fall back to index.html (R-7)."""
    dist = _frontend_dist()
    if not (dist / "index.html").is_file():
        raise Http404("frontend build not found; run pnpm build in frontend/")
    asset = _safe_file(dist, path.strip("/"))
    if asset is not None:
        return FileResponse(asset.open("rb"), filename=asset.name)
    return FileResponse((dist / "index.html").open("rb"), content_type="text/html")


def page_not_found(
    request: HttpRequest, exception: Exception
) -> FileResponse | JsonResponse:
    if request.path.startswith("/api/"):
        return JsonResponse({"detail": "Not found"}, status=404)
    return django_page_not_found(request, exception)
