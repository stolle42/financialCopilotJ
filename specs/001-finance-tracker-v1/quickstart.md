# Quickstart: Financial Copilot v1

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **API**: [contracts/api.md](contracts/api.md)

How to run the application and prove the feature works. Implementation details are in `tasks.md`
and the code, not here.

## Prerequisites

- Python 3.14 and [uv](https://docs.astral.sh/uv/)
- Node 24 and pnpm
- No database server: the default is a SQLite file
  ([research R-4](research.md#r-4-database))

## Setup

```powershell
cd backend
uv sync                       # creates .venv and installs Django, Ninja, pytest
uv run python manage.py migrate   # schema + seed: Cash account, predefined categories

cd ../frontend
pnpm install
```

The seed is described in [data-model.md](data-model.md#seed-data).

## Run (development)

Two terminals:

```powershell
cd backend;  uv run python manage.py runserver     # http://localhost:8000
cd frontend; pnpm dev                               # http://localhost:5173, proxies /api
```

Open http://localhost:5173. The app opens on the transaction list ([FR-063](spec.md#fr-063)).

## Run (single process, production build)

```powershell
cd frontend; pnpm build                             # writes frontend/dist
cd ../backend; uv run python manage.py runserver    # serves the SPA and the API on :8000
```

Open http://localhost:8000.

## Test

```powershell
cd backend;  uv run pytest          # domain tests (no Django) + API tests (in-memory SQLite)
cd frontend; pnpm test              # Vitest + Testing Library, API mocked with MSW
```

`uv run pytest backend/tests/domain` must pass without a database and without `DJANGO_SETTINGS_MODULE`
set; the guard test in that folder fails if any `backend/domain/` module imports Django
([research R-9](research.md#r-9-testing)).

## Validation scenarios

Each scenario is the acceptance list of a spec user story; run them in priority order after
`migrate` on a fresh database. Expected outcomes are stated in the linked scenarios and are not
repeated here.

| # | Story | Where to click | Proves |
|---|-------|----------------|--------|
| 1 | [User Story 1](spec.md#user-story-1) | `/` quick-add form, then `/accounts` | Balances derive from transactions ([SC-005](spec.md#sc-005)); the form saves untouched ([SC-002](spec.md#sc-002)); a transfer is neutral ([SC-004](spec.md#sc-004)); first-run flow ([SC-006](spec.md#sc-006)). |
| 2 | [User Story 2](spec.md#user-story-2) | `/import` → upload a sample export with a new profile → review → confirm; upload the same file again | Pending rows do not touch balances ([FR-022](spec.md#fr-022)); duplicates are excluded by default ([SC-003](spec.md#sc-003)); parse errors and duplicate counts are low-prominence and expandable ([FR-028](spec.md#fr-028)); 5,000 rows review in time ([SC-010](spec.md#sc-010)). |
| 3 | [User Story 3](spec.md#user-story-3) | `/insights`, change the period | Charts and budget progress for the period ([SC-001](spec.md#sc-001), [SC-009](spec.md#sc-009)); empty period renders empty. |
| 4 | [User Story 4](spec.md#user-story-4) | `/budgets`, set a limit, add expenses past it, view `/insights` | Over-limit is visible ([SC-011](spec.md#sc-011)). |
| 5 | [User Story 5](spec.md#user-story-5) | `/accounts` → Reconcile | The Unaccounted entry appears and the balance matches ([FR-005](spec.md#fr-005)). |
| 6 | [User Story 6](spec.md#user-story-6) | `/categories` | Protected pair cannot be deleted; deletion moves transactions and drops the budget ([FR-033](spec.md#fr-033), [FR-034](spec.md#fr-034)). |

Also check, once per release:

- Resize the browser to 360 px and walk every route ([SC-007](spec.md#sc-007)).
- With the network tab open, confirm no request leaves `localhost` while running scenarios 1–6
  ([FR-061](spec.md#fr-061)); this check changes when a hosted release is chosen
  ([research R-1](research.md#r-1-hosting-model-versus-the-spec)).

## Sample CSV files for scenario 2

Keep them under `backend/tests/fixtures/`: one comma-separated file with a signed amount column,
one semicolon-separated file with debit/credit columns and `%d.%m.%Y` dates and a `,` decimal
separator, one file with an unparsable row, and one containing a counterparty column with at least
two rows from the same vendor. They double as fixtures for the domain tests.
