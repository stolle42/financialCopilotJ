from ninja import NinjaAPI
from ninja.security import APIKeyCookie


class SpaCsrfAuth(APIKeyCookie):
    """Require CSRF on unsafe requests; v1 has no separate login."""

    def authenticate(self, request, key):  # noqa: ARG002
        return True


api = NinjaAPI(auth=SpaCsrfAuth(), title="Financial Copilot")


@api.post("/_csrf_probe")
def csrf_probe(request) -> dict[str, bool]:
    return {"ok": True}
