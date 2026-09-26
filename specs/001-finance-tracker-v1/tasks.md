# Tasks: Financial Copilot v1

**Input**: Design documents from `/specs/001-finance-tracker-v1/` — [plan.md](plan.md),
[spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Tests**: Included. The [constitution](../../.specify/memory/constitution.md) makes TDD mandatory
(Principle VII): each test task is written first and must fail before the implementation task that
follows it is started.

**Organization**: Tasks are grouped by user story in the spec's priority order. Descriptions link to
the requirement or design section they implement instead of restating it (Principle I).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 … US6)
- Every task names the files it creates or changes

## Path Conventions

Web application per [plan.md → Project Structure](plan.md#project-structure): `backend/` (Django,
uv) and `frontend/` (Vite, pnpm) at the repository root. Backend tests live in `backend/tests/`;
frontend tests sit next to the component they test as `*.test.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Two runnable, empty projects with their test runners wired, per
[research R-2](research.md#r-2-backend-framework-and-python-version), [R-5](research.md#r-5-frontend),
[R-9](research.md#r-9-testing), [R-11](research.md#r-11-python-and-javascript-tooling).

- [ ] T001 Create `backend/` and `frontend/` directories and extend the root `.gitignore` with generated paths: `backend/.venv/`, `backend/db.sqlite3`, `backend/**/__pycache__/`, `backend/.pytest_cache/`, `backend/.ruff_cache/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/openapi.json`
- [ ] T002 Initialise the backend with uv: `backend/pyproject.toml` declaring `django>=5.2,<6`, `django-ninja`, `dj-database-url`, `psycopg[binary]`, dev group `pytest`, `pytest-django`, `ruff`; `[tool.pytest.ini_options]` with `DJANGO_SETTINGS_MODULE = "config.settings"` and `testpaths = ["tests"]`; `[tool.ruff]` defaults. Run `uv sync` and commit `backend/uv.lock`
- [ ] T003 Create the Django project skeleton `backend/manage.py`, `backend/config/__init__.py`, `backend/config/settings.py` (database from `DATABASE_URL` with SQLite fallback and the Supabase transaction-pooler options from [R-4](research.md#r-4-database) applied only when the URL scheme is `postgres`), `backend/config/urls.py`, `backend/config/wsgi.py`; verify `uv run python manage.py check` passes
- [ ] T004 [P] Scaffold the frontend with `pnpm create vite frontend --template react-ts`, add Tailwind v4 via `@tailwindcss/vite` in `frontend/vite.config.ts` with a dev proxy `/api` → `http://localhost:8000` and `outDir: "dist"`, then run `pnpm dlx shadcn@latest init` producing `frontend/components.json` and `frontend/src/index.css`
- [ ] T005 [P] Add runtime libraries to `frontend/package.json`: `@tanstack/react-query`, `react-router`, `react-hook-form`, `@hookform/resolvers`, `zod`, `openapi-fetch`; add shadcn components `button input label select dialog alert-dialog form table card badge tabs sheet collapsible` into `frontend/src/components/ui/`
- [ ] T006 [P] Configure frontend tests: dev deps `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `msw`, `openapi-typescript`; `test` block in `frontend/vite.config.ts` (environment jsdom, setupFiles); `frontend/src/test/setup.ts` (jest-dom matchers, MSW server lifecycle); `frontend/src/test/server.ts` exporting an MSW `setupServer` with an empty handler list; `frontend/src/test/render.tsx` wrapping components in `QueryClientProvider` and a memory router; scripts `test`, `api:types` (`openapi-typescript openapi.json -o src/api/schema.d.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The architecture guards and the plumbing every story needs
([plan.md → Constitution Check](plan.md#constitution-check), [R-3](research.md#r-3-api-layer),
[R-6](research.md#r-6-contract-between-frontend-and-backend)).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Write the import-guard test `backend/tests/domain/test_no_django_imports.py`: walk every module under `backend/domain/`, parse with `ast`, fail on any `import django…`/`from django…`, and fail if the package has no modules. Run it: it must fail because `backend/domain/` does not exist yet
- [ ] T008 Create the pure-Python package `backend/domain/__init__.py` (empty) and `backend/tests/domain/__init__.py`, `backend/tests/__init__.py`, `backend/tests/api/__init__.py`, `backend/tests/conftest.py`; the guard test now passes
- [ ] T009 Create the four Django apps from [plan.md → Source Code](plan.md#source-code-repository-root) — `backend/ledger/`, `backend/imports/`, `backend/budgets/`, `backend/insights/` — each with `__init__.py`, `apps.py`, and `migrations/__init__.py` (`insights` without migrations); register them in `INSTALLED_APPS` in `backend/config/settings.py`
- [ ] T010 Write `backend/tests/api/test_openapi.py` asserting `GET /api/openapi.json` returns 200 with `openapi` and `paths` keys, and that a POST to a Ninja route without a CSRF token is rejected (403). Run it: must fail
- [ ] T011 Create `backend/config/api.py` with `api = NinjaAPI(csrf=True, title="Financial Copilot")` and mount it at `path("api/", api.urls)` in `backend/config/urls.py`; T010 passes
- [ ] T012 Add the type-generation chain: `uv run python manage.py export_openapi_schema --api config.api.api --output ../frontend/openapi.json` documented as script `api:export` in `frontend/package.json` (invoked via `pnpm api:export && pnpm api:types`), and generate the first `frontend/src/api/schema.d.ts` (committed; regenerated in every story)
- [ ] T013 Create the typed client `frontend/src/api/client.ts`: `openapi-fetch` `createClient<paths>({ baseUrl: "/api" })` with a middleware that reads the `csrftoken` cookie and sets `X-CSRFToken` on non-GET requests; unit test `frontend/src/api/client.test.ts` (header present on POST, absent on GET) written first
- [ ] T014 Create the app shell and routes in `frontend/src/main.tsx` and `frontend/src/App.tsx`: `QueryClientProvider`, `react-router` routes for all seven paths in [contracts → Frontend routes](contracts/api.md#frontend-routes-ui-contract) with placeholder pages, `/` as index ([FR-063](spec.md#fr-063)); `frontend/src/components/layout/AppShell.tsx` with a navigation that collapses into a shadcn `Sheet` below 640 px ([FR-060](spec.md#fr-060)); test `frontend/src/App.test.tsx` written first asserting the index route renders the transactions page and the nav lists all routes

**Checkpoint**: `uv run pytest` and `pnpm test` both green; `pnpm dev` + `runserver` show the shell.
Commit.

---

## Phase 3: User Story 1 — Keep a trustworthy ledger by hand (Priority: P1) 🎯 MVP

**Goal**: [User Story 1](spec.md#user-story-1) — accounts with computed balances, manual
expense/income/transfer entry, seeded Cash account and categories.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 1](quickstart.md#validation-scenarios).

### Tests for User Story 1 (write first, confirm they fail)

- [ ] T015 [P] [US1] Domain tests `backend/tests/domain/test_ledger.py` for `signed_effect`, `compute_balance`, `validate` per [data-model → Domain rules](data-model.md#domain-rules-pure-python-backenddomain) and [FR-002](spec.md#fr-002), [FR-011](spec.md#fr-011), [FR-012](spec.md#fr-012): expense/income/transfer signs on source and destination, zero amount allowed, negative rejected, category side must match kind, transfer needs a different destination and no category
- [ ] T016 [P] [US1] API tests `backend/tests/api/test_accounts.py` for [contracts → Accounts](contracts/api.md#accounts) (without reconcile): fresh database lists exactly the seeded Cash with balance `0.00` ([FR-006](spec.md#fr-006)); create returns the account with `balance == opening_balance`; duplicate name → 400; PATCH `opening_balance` changes the balance and creates no transaction; balances reflect transactions on both legs of a transfer (US1 scenarios 1–4)
- [ ] T017 [P] [US1] API tests `backend/tests/api/test_transactions.py` for [contracts → Transactions](contracts/api.md#transactions): create expense/income/transfer; 400 for category from the other side, missing category on expense, transfer with category, transfer with `destination_account_id == account_id`, negative amount ([FR-010](spec.md#fr-010), [FR-011](spec.md#fr-011)); PATCH kind changes follow [data-model → State transitions](data-model.md#state-transitions) ([FR-015](spec.md#fr-015)); DELETE; list sorted date desc and filtered by `account_id`, `category_id`, `kind`, `from`, `to`, `q`; `GET /transactions/defaults` returns the Cash account and each side's `uncategorised` id ([FR-014](spec.md#fr-014))
- [ ] T018 [P] [US1] API test `backend/tests/api/test_categories_list.py`: `GET /categories` returns both seeded sets from [data-model → Seed data](data-model.md#seed-data), each side containing exactly one `protected_role == "uncategorised"` and one `"unaccounted"` ([FR-031](spec.md#fr-031))

### Implementation for User Story 1

- [ ] T019 [US1] Implement `backend/domain/ledger.py` (`signed_effect`, `compute_balance`, `validate`) until T015 passes
- [ ] T020 [US1] Create `Account`, `Category`, `Transaction` models in `backend/ledger/models.py` with the enumerations and constraints from [data-model → Account](data-model.md#account), [Category](data-model.md#category), [Transaction](data-model.md#transaction) (check constraint, partial unique constraints, `PROTECT` foreign keys); generate `backend/ledger/migrations/0001_initial.py`
- [ ] T021 [US1] Write the seed data migration `backend/ledger/migrations/0002_seed.py` creating the Cash account and both category sets from [data-model → Seed data](data-model.md#seed-data) ([FR-006](spec.md#fr-006), [FR-031](spec.md#fr-031)), idempotent on re-run
- [ ] T022 [US1] Implement `backend/ledger/services.py`: `account_balances()` (one query annotating opening balance + signed sums via `domain.ledger`), `create_transaction`/`update_transaction` applying `domain.ledger.validate` and the kind-change rule, `manual_entry_defaults()` ([FR-006](spec.md#fr-006) fallback to most recently used account)
- [ ] T023 [US1] Implement `backend/ledger/schemas.py` and `backend/ledger/api.py` routers for accounts (list/create/patch), transactions (list/create/patch/delete/defaults), categories (list); register them in `backend/config/api.py`; T016–T018 pass
- [ ] T024 [US1] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts` (`pnpm api:export && pnpm api:types`)
- [ ] T025 [P] [US1] Frontend tests `frontend/src/features/transactions/TransactionForm.test.tsx` (MSW handlers in `frontend/src/test/handlers/ledger.ts`): opens with the defaults of [FR-014](spec.md#fr-014); saving untouched posts a `0.00` expense to Cash in Uncategorised (US1 scenario 8); category select lists only the current side with no empty option ([FR-011](spec.md#fr-011), [FR-030](spec.md#fr-030)); switching kind to transfer replaces the category with a destination select that omits the source account (scenario 7); switching side resets the category to that side's Uncategorised ([FR-015](spec.md#fr-015)); amount input refuses negatives
- [ ] T026 [P] [US1] Frontend tests `frontend/src/features/transactions/TransactionsPage.test.tsx`: renders the list from the API sorted by date, filter controls call the API with `account_id`/`kind`/`from`/`to`/`q`, editing a row opens the form prefilled, delete asks for confirmation
- [ ] T027 [P] [US1] Frontend tests `frontend/src/features/accounts/AccountsPage.test.tsx`: lists accounts with balances; create form (name, type select, opening balance); changing `opening_balance` in the edit form opens a shadcn `AlertDialog` whose text warns that every balance the account has ever shown will change and requires confirmation before the PATCH is sent ([FR-001](spec.md#fr-001), scenario 10); no input anywhere accepts a balance directly (scenario 11)
- [ ] T028 [US1] Implement query hooks `frontend/src/api/queries/accounts.ts`, `frontend/src/api/queries/transactions.ts`, `frontend/src/api/queries/categories.ts` with TanStack Query keys and mutations that invalidate `accounts` and `transactions` together (every mutation changes a balance)
- [ ] T029 [US1] Implement `frontend/src/lib/money.ts` (format decimal string with two places) and `frontend/src/lib/dates.ts` (`todayIso()`), used by both the transactions and accounts features
- [ ] T030 [US1] Implement `frontend/src/features/transactions/TransactionForm.tsx` (react-hook-form + zod, kind/category/destination behaviour) and `frontend/src/features/transactions/TransactionsPage.tsx` with `TransactionList.tsx` and `TransactionFilters.tsx`; wire `/` in `frontend/src/App.tsx`; T025–T026 pass
- [ ] T031 [US1] Implement `frontend/src/features/accounts/AccountsPage.tsx`, `AccountForm.tsx`, `OpeningBalanceWarning.tsx`; wire `/accounts`; T027 passes

**Checkpoint**: Run [quickstart scenario 1](quickstart.md#validation-scenarios) by hand. A usable
cash book exists. Commit.

---

## Phase 4: User Story 2 — Import a bank CSV and review it by vendor (Priority: P2)

**Goal**: [User Story 2](spec.md#user-story-2) — mapping profiles, pending batches, duplicate
flagging, vendor-grouped review, confirm/discard.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 2](quickstart.md#validation-scenarios).

### Tests for User Story 2 (write first, confirm they fail)

- [ ] T032 [P] [US2] Create the CSV fixtures described in [quickstart → Sample CSV files](quickstart.md#sample-csv-files-for-scenario-2) under `backend/tests/fixtures/`: `signed_comma.csv`, `debit_credit_semicolon_cp1252.csv`, `with_unparsable_rows.csv`, `with_counterparty.csv`, `header_only.csv`
- [ ] T033 [P] [US2] Domain tests `backend/tests/domain/test_csv_import.py`: `detect_delimiter` for `,` `;` tab; `parse_rows` with a signed column and with debit/credit columns ([FR-021](spec.md#fr-021)), `%d.%m.%Y` dates, `,` decimal separator, cp1252 decoding, per-row errors for unreadable date and missing amount ([FR-028](spec.md#fr-028)), header-only input yields zero rows; `propose_kind` per [FR-023](spec.md#fr-023) and [R-13](research.md#r-13-points-the-spec-leaves-open); a generated 5,000-row input parses in under 10 s ([SC-010](spec.md#sc-010))
- [ ] T034 [P] [US2] Domain tests `backend/tests/domain/test_duplicates.py` for `flag_duplicates` per [FR-024](spec.md#fr-024): match against existing (account, date, amount) keys regardless of description, the second identical row within a batch is flagged and the first is not, and a row matching a transfer whose destination is this account is flagged ([Edge Cases](spec.md#edge-cases))
- [ ] T035 [P] [US2] Domain tests `backend/tests/domain/test_grouping.py` for `group_by_counterparty` per [FR-026](spec.md#fr-026): rows sharing a counterparty form one group only when there are at least two, singletons and rows without a counterparty are returned ungrouped, group order follows first appearance
- [ ] T036 [P] [US2] API tests `backend/tests/api/test_import_profiles.py` for the profile endpoints in [contracts → Import](contracts/api.md#import): CRUD, unique name, 400 unless exactly one of `amount_column` or (`debit_column`, `credit_column`) is set ([data-model → MappingProfile](data-model.md#mappingprofile))
- [ ] T037 [P] [US2] API tests `backend/tests/api/test_import_batches.py` for the batch endpoints in [contracts → Import](contracts/api.md#import): upload creates a batch and rows and leaves `GET /accounts` balances unchanged ([FR-022](spec.md#fr-022)); every row starts in its side's Uncategorised ([FR-029](spec.md#fr-029)); duplicates and unparsable rows have `include == false` and are counted in the summary ([FR-025](spec.md#fr-025), [FR-028](spec.md#fr-028)); detail returns `groups`, `ungrouped_rows`, `unparsable_rows`; `PATCH …/rows` sets category for many rows, sets kind transfer with destination, and can include a duplicate but not an unparsable row; confirm creates exactly the included rows as transactions with the reviewed categories and deletes the batch ([FR-027](spec.md#fr-027)); confirm → 400 when an included transfer lacks a destination; discard deletes without touching the ledger; uploading `header_only.csv` → 400 "no transactions" and no batch; re-uploading a confirmed file flags every row ([SC-003](spec.md#sc-003))

### Implementation for User Story 2

- [ ] T038 [P] [US2] Implement `backend/domain/csv_import.py` until T033 passes
- [ ] T039 [P] [US2] Implement `backend/domain/duplicates.py` until T034 passes
- [ ] T040 [P] [US2] Implement `backend/domain/grouping.py` until T035 passes
- [ ] T041 [US2] Create `MappingProfile`, `PendingBatch`, `PendingRow` models in `backend/imports/models.py` per [data-model → MappingProfile](data-model.md#mappingprofile), [PendingBatch](data-model.md#pendingbatch), [PendingRow](data-model.md#pendingrow) (profile check constraint, unique `row_number` per batch, `CASCADE`/`PROTECT` as listed); migration `backend/imports/migrations/0001_initial.py`
- [ ] T042 [US2] Implement `backend/imports/services.py`: `create_batch(file, account, profile)` (decode → `domain.csv_import.parse_rows` → `domain.duplicates.flag_duplicates` with ledger keys and transfer counter-legs from `ledger.models` → bulk-create rows, raise on zero rows), `update_rows`, `confirm_batch` (transaction-wrapped, uses `ledger.services.create_transaction`), `discard_batch`, `batch_detail` (applies `domain.grouping`)
- [ ] T043 [US2] Implement `backend/imports/schemas.py` and `backend/imports/api.py` (profiles CRUD, multipart upload, list, detail, rows patch, confirm, discard); register in `backend/config/api.py`; T036–T037 pass
- [ ] T044 [US2] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts`
- [ ] T045 [P] [US2] Frontend tests `frontend/src/features/import/ProfileForm.test.tsx` (handlers in `frontend/src/test/handlers/import.ts`): fields of [FR-021](spec.md#fr-021) with the two amount layouts as a toggle, date format and encoding selects, save creates a profile; `frontend/src/features/import/ImportPage.test.tsx`: lists pending batches with counts, upload form needs account + profile + file, successful upload navigates to the review route
- [ ] T046 [P] [US2] Frontend tests `frontend/src/features/import/ReviewPage.test.tsx`: groups render with a group category select that patches every row id in the group; a `Collapsible` unfolds rows for per-row selects; profiles without counterparty show only ungrouped rows; each row select defaults to Uncategorised and has no empty option ([FR-029](spec.md#fr-029)); marking a row as transfer shows a destination select excluding the batch account ([FR-023](spec.md#fr-023)); duplicate and unparsable counts are rendered as small text buttons and only their click reveals the rows, with a reason per unparsable row and an include checkbox per duplicate ([FR-025](spec.md#fr-025), [FR-028](spec.md#fr-028)); confirm and discard call their endpoints and navigate back
- [ ] T047 [US2] Implement `frontend/src/api/queries/import.ts` (profiles, batches, rows patch, confirm, discard; confirm invalidates `transactions` and `accounts`)
- [ ] T048 [US2] Implement `frontend/src/features/import/ImportPage.tsx`, `UploadForm.tsx`, `ProfileForm.tsx`, `BatchList.tsx`; wire `/import`; T045 passes
- [ ] T049 [US2] Implement `frontend/src/features/import/ReviewPage.tsx`, `VendorGroup.tsx`, `PendingRowControls.tsx`, `HiddenRowsDisclosure.tsx`; wire `/import/:batchId`; T046 passes

**Checkpoint**: Run [quickstart scenario 2](quickstart.md#validation-scenarios) with a real bank
export. Commit.

---

## Phase 5: User Story 3 — See where the money went over a chosen period (Priority: P3)

**Goal**: [User Story 3](spec.md#user-story-3) — period selection, spending line, expense and
income breakdowns with Unaccounted and Uncategorised visible.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 3](quickstart.md#validation-scenarios).
Budget progress inside Insights is delivered by US4.

### Tests for User Story 3 (write first, confirm they fail)

- [ ] T050 [P] [US3] Domain tests `backend/tests/domain/test_insights.py`: `buckets` yields days for a period within one month and months otherwise ([R-13](research.md#r-13-points-the-spec-leaves-open)); `spending_over_time` sums expenses per bucket and ignores transfers ([FR-012](spec.md#fr-012)); `breakdown` returns amount and share per category including Uncategorised and Unaccounted at their true share ([FR-051](spec.md#fr-051), [FR-052](spec.md#fr-052)); empty input yields empty output
- [ ] T051 [P] [US3] API test `backend/tests/api/test_insights.py` for [contracts → Insights](contracts/api.md#insights) without the `budgets` key: only transactions dated within `from`–`to` are counted; transfers excluded; a reconciliation shortfall appears as expense Unaccounted and a surplus as income Unaccounted; a period with no data returns empty arrays; omitted `from`/`to` default to the current calendar month ([FR-050](spec.md#fr-050)); 5,000 bulk-created transactions answer in under 2 s ([SC-009](spec.md#sc-009))

### Implementation for User Story 3

- [ ] T052 [US3] Implement `backend/domain/insights.py` until T050 passes
- [ ] T053 [US3] Implement `backend/insights/queries.py` (ORM aggregation by `TruncDay`/`TruncMonth` and by category, transfers excluded, results handed to `domain.insights`), `backend/insights/schemas.py`, `backend/insights/api.py`; register in `backend/config/api.py`; T051 passes
- [ ] T054 [US3] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts`; add the shadcn `chart` component (`pnpm dlx shadcn@latest add chart`) into `frontend/src/components/ui/chart.tsx`
- [ ] T055 [P] [US3] Frontend tests `frontend/src/lib/periods.test.ts`: `currentMonth()`, presets from [R-13](research.md#r-13-points-the-spec-leaves-open), `isWithinOneMonth(from, to)`
- [ ] T056 [P] [US3] Frontend tests `frontend/src/features/insights/InsightsPage.test.tsx` (handlers in `frontend/src/test/handlers/insights.ts`): opens on the current month (US3 scenario 7); preset buttons and start/end inputs refetch with the new range; line and two donuts render from mocked data with category colours; Unaccounted slices carry a distinct visual marker (pattern class + legend label) ([FR-052](spec.md#fr-052)); empty data shows the empty state, not an error (scenario 6); charts expose no click handlers ([FR-053](spec.md#fr-053))
- [ ] T057 [US3] Implement `frontend/src/lib/periods.ts`; T055 passes
- [ ] T058 [US3] Implement `frontend/src/api/queries/insights.ts`, `frontend/src/features/insights/InsightsPage.tsx`, `PeriodPicker.tsx`, `SpendingLineChart.tsx`, `BreakdownDonut.tsx` (used once for expenses and once for income); wire `/insights`; T056 passes

**Checkpoint**: Run [quickstart scenario 3](quickstart.md#validation-scenarios). Commit.

---

## Phase 6: User Story 4 — Plan spending with monthly budgets (Priority: P4)

**Goal**: [User Story 4](spec.md#user-story-4) — monthly limits on non-protected expense
categories, progress and over-limit state in Insights for the most recent month in the period.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 4](quickstart.md#validation-scenarios).

### Tests for User Story 4 (write first, confirm they fail)

- [ ] T059 [P] [US4] Domain tests `backend/tests/domain/test_budgets.py`: `period_containing(date)` is the calendar month; `most_recent_period_in(start, end)` picks the latest month overlapping the period ([Edge Cases](spec.md#edge-cases)); `progress(limit, spent)` reports `over_limit` exactly when `spent > limit` ([FR-041](spec.md#fr-041), [FR-042](spec.md#fr-042))
- [ ] T060 [P] [US4] API tests `backend/tests/api/test_budgets.py` for [contracts → Budgets](contracts/api.md#budgets): PUT creates and updates; 409 for an income category and for either protected category ([FR-040](spec.md#fr-040)); DELETE removes; `GET /budgets?month=` returns `spent` from that month only, transfers excluded ([SC-004](spec.md#sc-004)), and a month with no expenses starts at `0.00` (US4 scenario 3)
- [ ] T061 [P] [US4] API test `backend/tests/api/test_insights_budgets.py`: `GET /insights` now includes `budgets.month` equal to the most recent calendar month in the period and `budgets.items` in the shape of `GET /budgets` (US4 scenario 6, [FR-051](spec.md#fr-051))

### Implementation for User Story 4

- [ ] T062 [US4] Implement `backend/domain/budgets.py` until T059 passes
- [ ] T063 [US4] Create `Budget` in `backend/budgets/models.py` per [data-model → Budget](data-model.md#budget) (one-to-one, `monthly_limit > 0` check, `CASCADE` from category); migration `backend/budgets/migrations/0001_initial.py`
- [ ] T064 [US4] Implement `backend/budgets/queries.py` (`progress_for_month(month)` joining budgets with that month's expense sums), `backend/budgets/schemas.py`, `backend/budgets/api.py` with the side/protected guard; register; T060 passes
- [ ] T065 [US4] Extend `backend/insights/api.py` and `backend/insights/schemas.py` with the `budgets` section using `budgets.queries.progress_for_month` and `domain.budgets.most_recent_period_in`; T061 passes
- [ ] T066 [US4] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts`
- [ ] T067 [P] [US4] Frontend tests `frontend/src/features/budgets/BudgetsPage.test.tsx` (handlers in `frontend/src/test/handlers/budgets.ts`): only non-protected expense categories are listed as budgetable (US4 scenario 4); set, change, remove call PUT/DELETE and refetch
- [ ] T068 [P] [US4] Frontend tests `frontend/src/features/insights/BudgetProgress.test.tsx`: heading shows the month label from the response; each item renders a progress bar; over-limit items carry a distinct colour class and an accessible status text so they are identifiable without reading the number ([SC-011](spec.md#sc-011))
- [ ] T069 [US4] Implement `frontend/src/api/queries/budgets.ts` (mutations invalidate `budgets` and `insights`), `frontend/src/features/budgets/BudgetsPage.tsx`, `BudgetLimitForm.tsx`; wire `/budgets`; T067 passes
- [ ] T070 [US4] Implement `frontend/src/features/insights/BudgetProgress.tsx` and render it in `InsightsPage.tsx`; T068 passes

**Checkpoint**: Run [quickstart scenario 4](quickstart.md#validation-scenarios). Commit.

---

## Phase 7: User Story 5 — Reconcile an account to reality (Priority: P5)

**Goal**: [User Story 5](spec.md#user-story-5) — book the difference between computed and actual
balance to Unaccounted.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 5](quickstart.md#validation-scenarios).

### Tests for User Story 5 (write first, confirm they fail)

- [ ] T071 [P] [US5] Domain tests `backend/tests/domain/test_reconciliation.py` for `reconciliation_entry` per [FR-005](spec.md#fr-005): lower actual → expense of the difference, higher → income, equal → none, dated the given day
- [ ] T072 [P] [US5] API test `backend/tests/api/test_reconcile.py` for `POST /accounts/{id}/reconcile` in [contracts → Accounts](contracts/api.md#accounts): US5 scenarios 1–3 (Unaccounted category of the right side, description "Reconciliation", dated today, `transaction: null` when equal) and scenario 4 on an account of type `savings`

### Implementation for User Story 5

- [ ] T073 [US5] Implement `backend/domain/reconciliation.py` until T071 passes
- [ ] T074 [US5] Add `reconcile(account, actual_balance)` to `backend/ledger/services.py` and the endpoint to `backend/ledger/api.py`/`schemas.py`; T072 passes
- [ ] T075 [US5] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts`
- [ ] T076 [US5] Frontend test `frontend/src/features/accounts/ReconcileDialog.test.tsx`: opens from every account row regardless of type; submits the actual balance; shows the booked transaction or the "already matches" message (US5 scenario 3); closes and the list shows the new balance
- [ ] T077 [US5] Implement `frontend/src/features/accounts/ReconcileDialog.tsx`, add the mutation to `frontend/src/api/queries/accounts.ts` (invalidates `accounts`, `transactions`, `insights`), and the trigger in `AccountsPage.tsx`; T076 passes

**Checkpoint**: Run [quickstart scenario 5](quickstart.md#validation-scenarios). Commit.

---

## Phase 8: User Story 6 — Organise categories (Priority: P6)

**Goal**: [User Story 6](spec.md#user-story-6) — create, rename, recolour, delete categories;
protected pair undeletable.

**Independent Test**: The story's own Independent Test plus [quickstart scenario 6](quickstart.md#validation-scenarios).

### Tests for User Story 6 (write first, confirm they fail)

- [ ] T078 [US6] API tests `backend/tests/api/test_categories.py` for the mutations in [contracts → Categories](contracts/api.md#categories): create on either side; same name on both sides succeeds, second on one side → 400 (US6 scenario 5, [FR-032](spec.md#fr-032)); PATCH name/colour works for protected categories too ([FR-033](spec.md#fr-033)); DELETE protected → 409 with an explanation; DELETE a category with transactions, pending rows, and a budget moves the transactions and rows to that side's Uncategorised and removes the budget ([FR-034](spec.md#fr-034), US6 scenario 3)

### Implementation for User Story 6

- [ ] T079 [US6] Add `create_category`, `update_category`, `delete_category` (reassign `transaction_set` and `pendingrow_set` inside one database transaction, then delete) to `backend/ledger/services.py`; add POST/PATCH/DELETE to `backend/ledger/api.py`/`schemas.py`; T078 passes
- [ ] T080 [US6] Regenerate `frontend/openapi.json` and `frontend/src/api/schema.d.ts`
- [ ] T081 [US6] Frontend test `frontend/src/features/categories/CategoriesPage.test.tsx` (handlers extend `frontend/src/test/handlers/ledger.ts`): two tabs (expense, income) never mixed ([FR-030](spec.md#fr-030)); create, rename, recolour; delete asks for confirmation and states that transactions move to Uncategorised; protected categories show no delete control and a tooltip/explanation instead (US6 scenario 4); duplicate name shows the API error
- [ ] T082 [US6] Implement `frontend/src/features/categories/CategoriesPage.tsx`, `CategoryForm.tsx`, mutations in `frontend/src/api/queries/categories.ts` (invalidate `categories`, `transactions`, `budgets`, `insights`); wire `/categories`; T081 passes

**Checkpoint**: Run [quickstart scenario 6](quickstart.md#validation-scenarios). Commit.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Single-process run, small-screen pass, and closing the design artifacts.

- [ ] T083 Write `backend/tests/api/test_spa.py`: `GET /` and `GET /insights` return `index.html` when `frontend/dist/index.html` exists (skip otherwise) and `GET /api/unknown` still returns 404 JSON. Then implement the catch-all view in `backend/config/urls.py` and `STATICFILES_DIRS`/`WhiteNoise`-free static serving in `backend/config/settings.py` per [R-7](research.md#r-7-serving-the-spa)
- [ ] T084 [P] Walk every route at 360 px per [quickstart → once per release](quickstart.md#validation-scenarios) and fix any horizontal overflow in the affected `frontend/src/features/**` components ([SC-007](spec.md#sc-007))
- [ ] T085 [P] Reduce `specs/001-finance-tracker-v1/contracts/api.md` to its Conventions and Frontend routes sections plus a pointer to `GET /api/openapi.json`, now that the served document is authoritative ([R-6](research.md#r-6-contract-between-frontend-and-backend), Principle I)
- [ ] T086 [P] Reconcile `specs/001-finance-tracker-v1/quickstart.md` with the real commands and scripts (`api:export`, `api:types`, test paths) so a fresh checkout on another machine follows it verbatim
- [ ] T087 Run the full check in `backend/` (`uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest`) and in `frontend/` (`pnpm lint`, `pnpm test`); fix findings in the files reported
- [ ] T088 Run all six [quickstart validation scenarios](quickstart.md#validation-scenarios) on a fresh database plus the network-tab check for [FR-061](spec.md#fr-061); record the pass in the commit message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T004–T006 run in parallel with T002–T003
- **Foundational (Phase 2)**: depends on Phase 1; blocks every story
- **US1 (Phase 3)**: depends on Phase 2; the models it creates are used by every later story
- **US2 (Phase 4)**: depends on US1 (accounts, categories, `create_transaction`)
- **US3 (Phase 5)**: depends on US1 (transactions); independent of US2
- **US4 (Phase 6)**: depends on US3 (budget progress renders inside Insights) and US1
- **US5 (Phase 7)**: depends on US1 only
- **US6 (Phase 8)**: depends on US1; its deletion test also exercises US2 and US4 models, so it is
  sequenced last. If US2/US4 are not built yet, drop those assertions from T078 and add them later
- **Polish (Phase 9)**: after the stories you intend to ship

### Within Each User Story

- Tests are written first and must fail; the implementation task that "makes them pass" follows
- Domain module → models → services → schemas/API → regenerate `schema.d.ts` → frontend tests →
  frontend implementation
- Regenerating `schema.d.ts` (T024, T044, T054, T066, T075, T080) is the hand-off point between
  backend and frontend work in every story

### Parallel Opportunities

- Phase 1: T004, T005, T006 alongside T002–T003
- Every story: its domain tests and API tests are independent files and run in parallel; its
  frontend test files likewise
- US2: T038, T039, T040 are three independent domain modules
- After US1 is done, US3 and US5 touch disjoint files and can proceed in parallel; US2 can run
  alongside either

---

## Parallel Example: User Story 1

```bash
# Tests first, in parallel (all must fail):
Task: "T015 domain tests in backend/tests/domain/test_ledger.py"
Task: "T016 API tests in backend/tests/api/test_accounts.py"
Task: "T017 API tests in backend/tests/api/test_transactions.py"
Task: "T018 API test in backend/tests/api/test_categories_list.py"

# After T024 regenerates the schema, frontend tests in parallel:
Task: "T025 frontend/src/features/transactions/TransactionForm.test.tsx"
Task: "T026 frontend/src/features/transactions/TransactionsPage.test.tsx"
Task: "T027 frontend/src/features/accounts/AccountsPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 → Phase 3
2. **STOP and VALIDATE**: [quickstart scenario 1](quickstart.md#validation-scenarios) on a fresh
   database; every balance equals opening balance plus net transactions ([SC-005](spec.md#sc-005))
3. This is a working cash book and the first thing worth showing

### Incremental Delivery

Each story phase ends with a checkpoint that maps to one quickstart scenario. Ship after any
checkpoint; nothing in a later phase is required for an earlier one to work.

### Parallel Team Strategy

After US1: one person on US2 (import), one on US3 → US4 (insights, budgets), one on US5 → US6
(reconcile, categories). Merge points are the `schema.d.ts` regenerations; regenerate on the
integration branch after each merge.

---

## Notes

- Commit after every red→green→refactor cycle and at every checkpoint
  ([agents.md](../../agents.md): small atomic commits)
- Extract shared code only on its second real use (Principle III); `frontend/src/lib/` and
  `backend/budgets/queries.py` are the places this list already anticipates a second use
- Nothing under `backend/domain/` may import Django; T007 enforces it on every test run
- Generated files that are committed: `backend/uv.lock`, `frontend/pnpm-lock.yaml`,
  `frontend/src/api/schema.d.ts`. Not committed: `frontend/openapi.json`, `frontend/dist/`,
  `backend/db.sqlite3`
