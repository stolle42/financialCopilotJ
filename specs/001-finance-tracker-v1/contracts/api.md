# API Contract: Financial Copilot v1

**Spec**: [../spec.md](../spec.md) · **Data model**: [../data-model.md](../data-model.md) ·
**Decision**: [research R-3](../research.md#r-3-api-layer), [R-6](../research.md#r-6-contract-between-frontend-and-backend)

## Authoritative schema

Request and response shapes are defined by **`GET /api/openapi.json`** on a running backend.
Regenerate the frontend types after API changes:

```powershell
cd frontend
pnpm api:export    # writes openapi.json from Django (gitignored)
pnpm api:types     # writes src/api/schema.d.ts
```

This file keeps **conventions** and **UI routes** only (Constitution Principle I; [R-6](../research.md#r-6-contract-between-frontend-and-backend)).

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

v1 targets a desktop browser; small-viewport layout is [Out of Scope](../spec.md#out-of-scope).
