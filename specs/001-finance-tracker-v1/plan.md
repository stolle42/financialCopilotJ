# Implementation Plan: Financial Copilot v1

**Branch**: `main` (feature directory `specs/001-finance-tracker-v1`) | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-finance-tracker-v1/spec.md`; requested stack:
Django backend, TypeScript frontend, shadcn for styling, Supabase for data, Vercel for hosting.

## Summary

Build the personal finance tracker specified in [spec.md](spec.md) (six user stories, priority
order [US1](spec.md#user-story-1) ledger → [US2](spec.md#user-story-2) CSV import →
[US3](spec.md#user-story-3) insights → [US4](spec.md#user-story-4) budgets →
[US5](spec.md#user-story-5) reconcile → [US6](spec.md#user-story-6) categories) as one Django
application that exposes a JSON API through Django Ninja and serves a Vite + React + shadcn/ui
single-page app from the same origin. Business rules live in a pure-Python `domain` package with
no Django imports; the ORM selects SQLite or Supabase Postgres from `DATABASE_URL`. v1 is planned
to run locally, as the spec requires; hosting on Vercel with Supabase is prepared by construction
and deferred to a later release ([research R-1](research.md#r-1-hosting-model-versus-the-spec)).

## Technical Context

**Language/Version**: Python 3.14 (backend); TypeScript 5 on Node 24 (frontend)

**Primary Dependencies**: Django 5.2 LTS, Django Ninja, dj-database-url, psycopg 3
([R-2](research.md#r-2-backend-framework-and-python-version), [R-3](research.md#r-3-api-layer));
Vite, React 19, Tailwind CSS v4, shadcn/ui (Recharts 3 via `chart`), react-router, TanStack
Query, react-hook-form + zod, openapi-typescript + openapi-fetch
([R-5](research.md#r-5-frontend), [R-6](research.md#r-6-contract-between-frontend-and-backend))

**Storage**: Django ORM; SQLite by default and for tests, Supabase Postgres when `DATABASE_URL`
is set ([R-4](research.md#r-4-database)). No filesystem state besides the SQLite file.

**Testing**: pytest + pytest-django (domain tests without Django, API tests on in-memory SQLite,
import-guard test); Vitest + Testing Library + MSW ([R-9](research.md#r-9-testing))

**Target Platform**: Modern browser (desktop and 360 px mobile, [SC-007](spec.md#sc-007))
against a Django process on the user's machine; deployable unchanged to Vercel Fluid compute +
Supabase ([R-7](research.md#r-7-serving-the-spa), [R-10](research.md#r-10-deployment-deferred-see-r-1))

**Project Type**: Web application (backend + frontend, single deployable)

**Performance Goals**: [SC-009](spec.md#sc-009) insights for 5,000 transactions in ≤ 2 s;
[SC-010](spec.md#sc-010) 5,000-row CSV parsed and shown in ≤ 5 s; [SC-002](spec.md#sc-002)
untouched form saves in one click

**Constraints**: [FR-061](spec.md#fr-061) no external connections while the spec stands;
[FR-062](spec.md#fr-062) no money movement; single user, no sign-in
([R-13](research.md#r-13-points-the-spec-leaves-open)); currency-agnostic decimal amounts

**Scale/Scope**: one user, a handful of accounts, tens of categories, thousands of
transactions, seven screens ([contracts/api.md](contracts/api.md#frontend-routes-ui-contract)),
about thirty endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
Source: [constitution v1.0.1](../../.specify/memory/constitution.md).

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Duplication Is Forbidden | Plan artifacts link to spec requirements instead of restating them; the spec is the single source. | PASS: anchors added to every FR, SC, story and section in spec.md; research, data model, contract and quickstart cite them. | PASS: [data-model.md](data-model.md) states rules only where they are new (types, constraints) and cites the FR for meaning; [contracts/api.md](contracts/api.md) will shrink to conventions once the served OpenAPI document exists ([R-6](research.md#r-6-contract-between-frontend-and-backend)). |
| II. KISS | Smallest architecture that satisfies the spec. | PASS with one tension: the requested hosting stack adds infrastructure the spec forbids. Resolved by planning for local run and making hosting a configuration change ([R-1](research.md#r-1-hosting-model-versus-the-spec)). | PASS: one process, one origin, no CORS, no auth, no pagination, no stored balances, no status columns, no reconciliation entity. Supabase Auth/PostgREST/RLS not used. |
| III. DRY | Shared code extracted on the second real use only. | PASS: nothing shared yet. | PASS: the one deliberate single point is `domain/` rules used by both the API and the import service (balance sign, period, duplicate key); generated `schema.d.ts` prevents hand-copied types. |
| IV. SOLID | Interfaces only at swapped boundaries. | PASS: the swapped boundaries are the database engine (Django ORM already abstracts it) and nothing else. | PASS: no repository layer, no service interfaces; Django apps split by reason to change (`ledger`, `imports`, `budgets`, `insights`). |
| V. Clean Code | Names say what the value is; one thing per function. | N/A before code. | PASS by design: domain functions are named after the rule they implement ([data-model.md → Domain rules](data-model.md#domain-rules-pure-python-backenddomain)). Enforced at implementation. |
| VI. Clean Architecture | Business rules import no framework, UI, or persistence. | PASS: planned `backend/domain/` package. | PASS: `domain/` is pure Python; a guard test fails on any `django` import ([R-9](research.md#r-9-testing)). Django models, Ninja schemas and React components depend inward. |
| VII. TDD | Every behaviour change has a failing test first. | PASS: test stack chosen in [R-9](research.md#r-9-testing). | PASS: tasks will pair each FR with a domain or API test before implementation; quickstart lists the manual checks that remain ([quickstart.md](quickstart.md#validation-scenarios)). |
| Precedence (KISS until duplicated logic changes for the same reason) | | | Applied in III and IV above. |

**Gate result**: PASS. No violations to justify. The hosting tension is decided in
[R-1](research.md#r-1-hosting-model-versus-the-spec); nothing blocks Phase 2.

## Project Structure

### Documentation (this feature)

```text
specs/001-finance-tracker-v1/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R-1 … R-12
├── data-model.md        # Phase 1: entities, constraints, domain rule map, seed data
├── quickstart.md        # Phase 1: run, test, validate
├── contracts/
│   └── api.md           # Phase 1: endpoint and route contract (superseded by /api/openapi.json)
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
backend/
├── manage.py
├── pyproject.toml                 # uv-managed; Django, django-ninja, dj-database-url, psycopg[binary], pytest, pytest-django, ruff
├── config/
│   ├── settings.py                # DATABASE_URL, STATICFILES_DIRS → ../frontend/dist, Ninja CSRF
│   ├── urls.py                    # /api/ → NinjaAPI; catch-all → SPA index.html
│   └── wsgi.py                    # WSGI_APPLICATION (also what Vercel would run)
├── domain/                        # pure Python, no Django imports (Principle VI)
│   ├── ledger.py
│   ├── reconciliation.py
│   ├── csv_import.py
│   ├── duplicates.py
│   ├── grouping.py
│   ├── budgets.py
│   └── insights.py
├── ledger/                        # Django app: Account, Category, Transaction, seed migration, /accounts /categories /transactions
│   ├── models.py
│   ├── services.py                # orchestrates domain rules + ORM (reconcile, delete category, kind change)
│   ├── schemas.py                 # Ninja schemas
│   ├── api.py                     # Ninja routers
│   └── migrations/
├── imports/                       # Django app: MappingProfile, PendingBatch, PendingRow, /import
│   ├── models.py
│   ├── services.py                # parse → flag duplicates → store rows; confirm → transactions
│   ├── schemas.py
│   ├── api.py
│   └── migrations/
├── budgets/                       # Django app: Budget, /budgets
│   ├── models.py
│   ├── schemas.py
│   ├── api.py
│   └── migrations/
├── insights/                      # Django app: no models; /insights aggregation
│   ├── queries.py
│   ├── schemas.py
│   └── api.py
└── tests/
    ├── domain/                    # no database, no DJANGO_SETTINGS_MODULE; includes the import-guard test
    ├── api/                       # Django test client, in-memory SQLite
    └── fixtures/                  # sample CSV files (see quickstart)

frontend/
├── package.json                   # pnpm; vite, react, tailwindcss, shadcn deps, @tanstack/react-query, react-router, react-hook-form, zod, openapi-fetch; dev: vitest, @testing-library/react, msw, openapi-typescript
├── vite.config.ts                 # @tailwindcss/vite, /api proxy → :8000, outDir dist
├── components.json                # shadcn config
├── src/
│   ├── main.tsx                   # router + QueryClientProvider
│   ├── api/
│   │   ├── schema.d.ts            # generated by openapi-typescript (committed)
│   │   ├── client.ts              # openapi-fetch instance with CSRF header
│   │   └── queries/               # one file per resource: hooks + invalidation
│   ├── components/ui/             # shadcn-generated components (owned, not edited casually)
│   ├── features/
│   │   ├── transactions/          # landing list, filters, quick-add form (US1)
│   │   ├── accounts/              # list with balances, edit with opening-balance warning, reconcile (US1, US5)
│   │   ├── categories/            # both sides, protected handling (US6)
│   │   ├── import/                # upload, profiles, review with groups and low-prominence counts (US2)
│   │   ├── budgets/               # limits (US4)
│   │   └── insights/              # period picker, charts, budget progress (US3)
│   └── lib/                       # formatters (money, date), period helpers shared by ≥ 2 features only
└── tests/                         # Vitest; MSW handlers per resource
```

**Structure Decision**: Web application with a `backend/` and a `frontend/` directory at the
repository root, deployed as one unit (Django serves `frontend/dist`). Vercel's Django detection
looks for `manage.py` in an immediate subdirectory, which `backend/manage.py` satisfies
([R-7](research.md#r-7-serving-the-spa)). Django apps are cut along the spec's feature areas so
each has one reason to change (Principle IV); `domain/` sits outside all apps so it cannot depend
on them (Principle VI).

## Complexity Tracking

No constitution violations; nothing to justify.

## Owner decisions (2026-09-25)

1. **Hosting**: v1 stays local and deployment-ready; Vercel + Supabase remain a later
   configuration step ([R-1](research.md#r-1-hosting-model-versus-the-spec),
   [R-10](research.md#r-10-deployment-deferred-see-r-1)).
2. **Django release**: 5.2 LTS ([R-2](research.md#r-2-backend-framework-and-python-version)).
3. **Spec Assumptions section**: stays removed; FR-050 was rewritten without the reference, and
   [R-13](research.md#r-13-points-the-spec-leaves-open) records the planning decisions on those points.
