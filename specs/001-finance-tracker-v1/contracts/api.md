# API Contract: Financial Copilot v1

**Spec**: [../spec.md](../spec.md) · **Data model**: [../data-model.md](../data-model.md) ·
**Decision**: [research R-3](../research.md#r-3-api-layer), [R-6](../research.md#r-6-contract-between-frontend-and-backend)

This is the design-time contract. Once the backend exists, `GET /api/openapi.json` is the
authoritative contract and the frontend's `schema.d.ts` is generated from it; this file then keeps
only the conventions section and the endpoint index.

## Conventions

- Base path `/api/`. JSON in and out. Dates are `YYYY-MM-DD`; amounts are decimal strings with two
  places (`"12.50"`) so nothing is rounded in transit.
- Field names match [data-model.md](../data-model.md); foreign keys are sent as `<name>_id`.
- Errors: `400` with `{"detail": [{"loc": [...], "msg": "..."}]}` for validation (Ninja default),
  `404` for unknown ids, `409` for rule violations that are not field errors (e.g. deleting a
  protected category), each with `{"detail": "..."}`.
- Mutations require the `X-CSRFToken` header; the token is read from the `csrftoken` cookie.
- No authentication (single user, [R-13](../research.md#r-13-points-the-spec-leaves-open)). See
  [research R-1](../research.md#r-1-hosting-model-versus-the-spec) if hosted.
- Lists are unpaginated in v1 ([SC-009](../spec.md#sc-009)/[SC-010](../spec.md#sc-010) sizes fit
  one response); the transaction list accepts filters instead.

## Endpoints

### Accounts

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /accounts` | → `[Account & {balance}]` | [FR-002](../spec.md#fr-002) |
| `POST /accounts` | `{name, type, opening_balance}` → `Account` | [FR-001](../spec.md#fr-001), [FR-004](../spec.md#fr-004) |
| `PATCH /accounts/{id}` | `{name?, type?, opening_balance?}` → `Account` | [FR-001](../spec.md#fr-001) |
| `POST /accounts/{id}/reconcile` | `{actual_balance}` → `{transaction: Transaction \| null, balance}` | [FR-005](../spec.md#fr-005) |

`balance` is computed per request; there is no stored balance to invalidate.

### Categories

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /categories` | → `[Category]` (both sides; client filters by `side`) | [FR-030](../spec.md#fr-030) |
| `POST /categories` | `{name, colour, side}` → `Category` | [FR-032](../spec.md#fr-032) |
| `PATCH /categories/{id}` | `{name?, colour?}` → `Category` | [FR-032](../spec.md#fr-032), [FR-033](../spec.md#fr-033) |
| `DELETE /categories/{id}` | → `204`; `409` when `protected_role` is set | [FR-033](../spec.md#fr-033), [FR-034](../spec.md#fr-034) |

### Transactions

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /transactions?account_id&category_id&kind&from&to&q` | → `[Transaction]` sorted by date desc, id desc | [FR-013](../spec.md#fr-013), [FR-014](../spec.md#fr-014) |
| `POST /transactions` | `TransactionIn` → `Transaction` | [FR-010](../spec.md#fr-010), [FR-011](../spec.md#fr-011) |
| `PATCH /transactions/{id}` | partial `TransactionIn` → `Transaction` | [FR-015](../spec.md#fr-015) |
| `DELETE /transactions/{id}` | → `204` | [FR-015](../spec.md#fr-015) |
| `GET /transactions/defaults` | → `{account_id, expense_category_id, income_category_id}` | [FR-006](../spec.md#fr-006), [Edge Cases](../spec.md#edge-cases) |

`TransactionIn = {date, amount, description, kind, account_id, category_id?, destination_account_id?}`
validated per the Transaction constraints in the data model. `/defaults` returns the manual-entry
default account (or the most recently used one when no default exists) and each side's
`uncategorised` id so the form opens saveable.

### Import

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /import/profiles` · `POST /import/profiles` · `PATCH /import/profiles/{id}` · `DELETE /import/profiles/{id}` | `MappingProfile` | [FR-021](../spec.md#fr-021) |
| `POST /import/batches` | multipart `{file, account_id, profile_id}` → `PendingBatchDetail` | [FR-020](../spec.md#fr-020), [FR-022](../spec.md#fr-022), [FR-023](../spec.md#fr-023), [FR-024](../spec.md#fr-024), [FR-028](../spec.md#fr-028) |
| `GET /import/batches` | → `[PendingBatchSummary]` (`id, account, profile, source_filename, created_at, row_count, unparsable_count, duplicate_count`) | [FR-022](../spec.md#fr-022), [FR-028](../spec.md#fr-028) |
| `GET /import/batches/{id}` | → `PendingBatchDetail` (summary + `groups: [{counterparty, rows}]` + `ungrouped_rows` + `unparsable_rows`) | [FR-026](../spec.md#fr-026), [FR-028](../spec.md#fr-028) |
| `PATCH /import/batches/{id}/rows` | `[{row_id, category_id?, kind?, destination_account_id?, include?}]` → `PendingBatchDetail` | [FR-025](../spec.md#fr-025), [FR-026](../spec.md#fr-026), [FR-029](../spec.md#fr-029) |
| `POST /import/batches/{id}/confirm` | → `{created: number}`; `400` if any included row lacks a category or destination | [FR-027](../spec.md#fr-027), [FR-029](../spec.md#fr-029) |
| `DELETE /import/batches/{id}` | → `204` (discard) | [FR-027](../spec.md#fr-027) |

Row-level updates are batched in one request so assigning a group category is one call that sets
every row in the group ([FR-026](../spec.md#fr-026)); the client expands the group to row ids.

### Budgets

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /budgets?month=YYYY-MM` | → `[{category, monthly_limit, spent, over_limit}]` for the given month (default: current) | [FR-041](../spec.md#fr-041), [FR-042](../spec.md#fr-042) |
| `PUT /budgets/{category_id}` | `{monthly_limit}` → `Budget`; `409` for income or protected categories | [FR-040](../spec.md#fr-040) |
| `DELETE /budgets/{category_id}` | → `204` | [FR-040](../spec.md#fr-040) |

### Insights

| Method & path | Body → Response | Requirement |
|---------------|-----------------|-------------|
| `GET /insights?from&to` | → `{spending_over_time: [{bucket, amount}], expense_breakdown: [{category, amount, share}], income_breakdown: [...], budgets: {month, items}}` | [FR-050](../spec.md#fr-050), [FR-051](../spec.md#fr-051), [FR-052](../spec.md#fr-052), [FR-041](../spec.md#fr-041) |

`budgets.month` is the most recent calendar month that overlaps the period
([Edge Cases](../spec.md#edge-cases)); `items` has the shape of `GET /budgets`. Buckets are daily
when the period lies within one month, monthly otherwise
([R-13](../research.md#r-13-points-the-spec-leaves-open)).
A period with no data returns empty arrays and zero totals ([Edge Cases](../spec.md#edge-cases)).

## Frontend routes (UI contract)

| Route | Screen | Requirement |
|-------|--------|-------------|
| `/` | Transaction list (landing) + quick-add form | [FR-063](../spec.md#fr-063), [User Story 1](../spec.md#user-story-1) |
| `/accounts` | Accounts with balances, create/edit, reconcile | [User Story 5](../spec.md#user-story-5) |
| `/categories` | Both sides, create/rename/recolour/delete | [User Story 6](../spec.md#user-story-6) |
| `/import` | Pending batches, upload, profiles | [User Story 2](../spec.md#user-story-2) |
| `/import/{batchId}` | Review: groups, per-row controls, low-prominence counts | [FR-025](../spec.md#fr-025), [FR-026](../spec.md#fr-026), [FR-028](../spec.md#fr-028) |
| `/budgets` | Limits per expense category | [User Story 4](../spec.md#user-story-4) |
| `/insights` | Period picker, charts, budget progress | [User Story 3](../spec.md#user-story-3) |

All routes work at 360 px wide ([SC-007](../spec.md#sc-007)).
