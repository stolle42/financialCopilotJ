# Research: Financial Copilot v1

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-25

Each entry records a decision, its rationale, and the alternatives considered. Versions were checked
on 2026-09-25 against vendor documentation and the toolchain installed on the development machine
(Python 3.14.3, uv 0.12, Node 24.19, pnpm 8.15; no Docker, no Supabase CLI, no Vercel CLI).

## R-1 Hosting model versus the spec

**Finding**: The requested stack ("Vercel for hosting, Supabase for data") contradicts two spec
statements: [FR-061](spec.md#fr-061) (no user data to an external party; no network required) and
"v1 is a local web app" under [Out of Scope](spec.md#out-of-scope). (A third, SC-008 "no
connection other than the user's own machine", was removed by the owner on 2026-09-25 so the
success criteria no longer pin the hosting model.) The app has no sign-in
([R-13](#r-13-points-the-spec-leaves-open)), which is unsafe on a public URL.

**Decision** (owner, 2026-09-25: "keep it flexible"): Build against the spec as written. v1 runs
on the user's machine. The architecture is shaped so that Vercel + Supabase becomes configuration,
not redesign: one Django WSGI application that also serves the built frontend (R-7), the database
chosen by `DATABASE_URL` (R-4), no state on the filesystem, no CORS. Deployment work is not in v1
until the spec says so (Constitution Principle II).

**When the owner later chooses a hosted release**: amend FR-061 to "user data lives only in the
user's own Supabase project and Vercel deployment; no telemetry; no third party beyond the hosting
the user chose", replace the "local web app" sentence, and add the deployment tasks in R-10. Access
control needs no app-level login: Vercel Authentication set to **All Deployments** gates production
behind a Vercel sign-in and has been free on every plan, including Hobby, since 2026-09-09
([changelog](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)).
"Single user, no sign-in" can therefore stand.

**Alternatives**: app-level login via Supabase Auth (adds scope the spec excludes and a second
identity system); local only, never hosted (ignores the explicit stack request).

## R-2 Backend framework and Python version

- **Decision**: Django 5.2 LTS (5.2.17 or later) on Python 3.14.
- **Rationale**: 5.2 LTS added Python 3.14 support in 5.2.8 and receives fixes until April 2028.
  Django 6.1 (August 2026) is current but non-LTS with support ending December 2027, and nothing in
  v1 needs a 6.x feature.
- **Alternatives**: Django 6.1, rejected by the owner (2026-09-25) in favour of the LTS line.

## R-3 API layer

- **Decision**: Django Ninja. JSON API under `/api/`, Pydantic request/response schemas, OpenAPI
  served at `/api/openapi.json`. Django's CSRF protection stays on (`NinjaAPI(csrf=True)`); the SPA
  sends the `csrftoken` cookie value as `X-CSRFToken`.
- **Rationale**: typed schemas produce the OpenAPI document that generates the frontend's types
  (R-6), so both sides share one contract with the least code. Fewer moving parts than DRF's
  serializer/viewset/router triple for about thirty endpoints.
- **Alternatives**: Django REST Framework (larger ecosystem, more ceremony); plain Django JSON views
  (hand-written validation, no schema).

## R-4 Database

- **Decision**: Django ORM everywhere; the engine is selected by `DATABASE_URL` (via
  `dj-database-url`).
  - Unset (default): SQLite file inside `backend/`. Zero setup, works offline, and is what the
    spec's "local web app" needs today.
  - Set: Supabase Postgres. From a persistent process (local `runserver`, migrations) use the
    Supavisor **session** pooler (port 5432, IPv4). From Vercel functions use the Supavisor
    **transaction** pooler (port 6543) with `OPTIONS={"sslmode": "require",
    "prepare_threshold": None, "server_side_binding": False}`,
    `DISABLE_SERVER_SIDE_CURSORS=True`, `CONN_MAX_AGE=0`, because transaction mode does not
    support prepared statements or server-side cursors.
  - Tests run on SQLite in memory.
- **Rationale**: Supabase's local stack requires Docker, which is not installed here; Supabase's
  free-tier direct connection is IPv6-only, so the pooler is the supported IPv4 path. SQLite keeps
  the TDD loop fast and the app offline-capable. Everything v1 uses (`CheckConstraint`,
  `UniqueConstraint`, `TruncMonth`, `DecimalField`) behaves the same on both engines. The parity
  risk is accepted and mitigated by running the backend suite against a Supabase project before
  any deployment.
- **Alternatives**: Docker + `supabase start` (best parity, heaviest setup); a Supabase dev project
  as the local development database (network round-trip per query; violates
  [FR-061](spec.md#fr-061) while it stands); a local Postgres install (one more service to run).
- **Not used in v1**: Supabase Auth, PostgREST, Realtime, Storage, Row Level Security. Django owns
  the schema and is the only client.

## R-5 Frontend

- **Decision**: Vite + React 19 + TypeScript; Tailwind CSS v4 through `@tailwindcss/vite`;
  shadcn/ui initialised with `pnpm dlx shadcn@latest init` (Vite path); `react-router` in library
  mode for six routes; TanStack Query for server state; `react-hook-form` + `zod` for forms (what
  shadcn's Form components assume); shadcn `chart` (Recharts 3) for the line, donut, and bar
  charts.
- **Rationale**: shadcn requires React and Tailwind; its documented Vite setup is the smallest that
  works. TanStack Query: every mutation must refresh balances and lists on other screens; a
  hand-rolled cache would be a second implementation of the same invalidation logic.
- **Alternatives**: Next.js (a server layer we do not need next to Django); plain `fetch` +
  `useState` (invalidation duplicated per screen).

## R-6 Contract between frontend and backend

- **Decision**: `openapi-typescript` generates `frontend/src/api/schema.d.ts` from
  `/api/openapi.json`; `openapi-fetch` is the typed client. The design-time contract is
  [contracts/api.md](contracts/api.md). Once the API exists, the served OpenAPI document is the
  authoritative contract and `api.md` shrinks to conventions plus a link.
- **Rationale**: one source for request and response shapes; mismatches fail at compile time.

## R-7 Serving the SPA

- **Decision**: Development: Vite's dev server proxies `/api` to Django on port 8000. Production
  build: `vite build` writes `frontend/dist`, which Django adds to `STATICFILES_DIRS`; a catch-all
  view returns `index.html` for client-side routes. Same origin, so no CORS, one URL, one process.
- **On Vercel (only if R-1 resolves to hosted)**: Vercel's zero-configuration Django support
  (April 2026) detects `manage.py` in an immediate subdirectory, resolves `WSGI_APPLICATION`,
  runs `collectstatic`, serves static files from its CDN, and runs Django as one function on
  Fluid compute. The build command must run the frontend build first.
- **Alternatives**: two deployments (static frontend + API): CORS, two protection gates.

## R-8 CSV parsing

- **Decision**: Standard library only: `csv`, `decimal`, `datetime.strptime`, decoding with the
  profile's encoding. The delimiter is detected from the header line among `,`, `;`, and tab
  (whichever occurs most). The whole file is parsed in memory; 5,000 rows is small
  ([SC-010](spec.md#sc-010)).
- **Rationale**: no pandas dependency, and the parsing rules live in pure Python where they are
  unit-tested without Django.
- **Alternatives**: pandas (heavy; pushes rules into a library API); a delimiter field on the
  profile ([FR-021](spec.md#fr-021) lists no such field, and detection covers real exports).

## R-9 Testing

- **Decision**:
  - Backend: `pytest` + `pytest-django`. Tests under `backend/tests/domain/` import nothing from
    Django and need no database. API tests use Django's test client on in-memory SQLite. One guard
    test asserts that no module under `backend/domain/` imports `django`, enforcing Constitution
    Principle VI.
  - Frontend: Vitest + Testing Library; MSW mocks the API.
  - No end-to-end runner in v1. [SC-007](spec.md#sc-007) (360 px) and the timing criteria are
    checked by hand following [quickstart.md](quickstart.md).
- **Alternatives**: Playwright for the Given/When/Then scenarios; add it when the manual pass
  becomes the bottleneck.

## R-10 Deployment (deferred, see R-1)

What a hosted release would add, recorded so it can be costed when wanted: one Vercel project at the
repository root with Deployment Protection → Vercel Authentication → All Deployments; environment
variables `DATABASE_URL` (transaction pooler), `SECRET_KEY`, `DJANGO_SETTINGS_MODULE`,
`ALLOWED_HOSTS` including `.vercel.app`; `vercel.json` with the function keyed on
`backend/config/wsgi.py` and a build command that builds the frontend; `manage.py migrate` run
from the developer's machine against the session-mode URL (functions are ephemeral); one free
Supabase project.

## R-11 Python and JavaScript tooling

- **Decision**: `pyproject.toml` managed by uv (`uv sync`, `uv run`); pnpm for the frontend.
  Formatting and linting: Ruff (backend), ESLint + Prettier as scaffolded by Vite (frontend).
- **Rationale**: both are installed; uv replaces venv + pip with one tool.

## R-12 First-launch data

- **Decision**: A Django data migration creates the predefined "Cash" account
  ([FR-006](spec.md#fr-006)) and both category sets ([FR-031](spec.md#fr-031)). The lists are in
  [data-model.md](data-model.md#seed-data). "First launch" therefore means the first
  `manage.py migrate`.
- **Rationale**: migrations already run once per database and are idempotent; no separate
  bootstrap step.

## R-13 Points the spec leaves open

The spec's Assumptions section was removed in commit `c08b31b` and the owner confirmed the
removal (2026-09-25; [FR-050](spec.md#fr-050) no longer references it). The plan decides these
points here so implementation is not blocked:

- **Spending-over-time buckets** for [FR-051](spec.md#fr-051): one point per day when the period
  lies within a single calendar month, otherwise one point per calendar month.
- **Uniqueness**: account names, mapping-profile names, and category names within a side are
  unique.
- **Import amount direction** for [FR-023](spec.md#fr-023): in a single signed column, negative
  is money out; with separate columns, the debit column is money out.
- **Protected categories are selectable** in every category picker like any other category
  ([FR-031](spec.md#fr-031) protects them from deletion, not from use).
- **Predefined category lists** are a planning choice ([data-model.md](data-model.md#seed-data));
  the spec requires only that both sides have predefined lists plus the protected pair.
