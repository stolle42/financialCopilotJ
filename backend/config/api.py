from django.middleware.csrf import get_token
from ninja import NinjaAPI
from ninja.security import APIKeyCookie


class SpaCsrfAuth(APIKeyCookie):
    """Require CSRF on unsafe requests; v1 has no separate login."""

    def authenticate(self, request, key):  # noqa: ARG002
        return True


api = NinjaAPI(auth=SpaCsrfAuth(), title="Financial Copilot")

from ledger.api import router as ledger_router  # noqa: E402
from imports.api import router as imports_router  # noqa: E402

api.add_router("", ledger_router)
api.add_router("", imports_router)


@api.get("/health")
def health(request) -> dict[str, str]:
    get_token(request)
    return {"status": "ok"}


@api.post("/_csrf_probe")
def csrf_probe(request) -> dict[str, bool]:
    return {"ok": True}
