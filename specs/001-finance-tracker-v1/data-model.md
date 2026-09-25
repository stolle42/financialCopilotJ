# Data Model: Financial Copilot v1

**Spec**: [spec.md](spec.md) · **Entities in spec**: [Key Entities](spec.md#key-entities) ·
**Research**: [research.md](research.md)

Every rule below cites the requirement it implements; the requirement text lives in the spec only.
Amounts are `Decimal(12, 2)`, non-negative, currency-agnostic. Dates are calendar dates without
time. All identifiers are integer primary keys.

## Enumerations

| Name | Values | Used by |
|------|--------|---------|
| `AccountType` | `checking`, `savings`, `credit_card`, `cash`, `other` | Account. Descriptive only ([FR-004](spec.md#fr-004)). |
| `Side` | `expense`, `income` | Category ([FR-030](spec.md#fr-030)). |
| `Kind` | `expense`, `income`, `transfer` | Transaction, PendingRow ([FR-010](spec.md#fr-010)). |
| `ProtectedRole` | `uncategorised`, `unaccounted`, or none | Category ([FR-031](spec.md#fr-031)). Identity of the protected pair, independent of their editable names. |

`Kind.expense` and `Kind.income` correspond to `Side.expense` and `Side.income`; a transfer has no
side.

## Entities

### Account

| Field | Type | Rules |
|-------|------|-------|
| `name` | text | Unique ([Edge Cases](spec.md#edge-cases)). |
| `type` | `AccountType` | No behaviour depends on it ([FR-004](spec.md#fr-004)). |
| `opening_balance` | decimal | What the account held before its earliest recorded transaction ([FR-001](spec.md#fr-001)). The severe warning on change is a UI concern; the API accepts the change. |
| `is_manual_entry_default` | bool | True for exactly one account: the predefined "Cash" ([FR-006](spec.md#fr-006)). Enforced by a partial unique constraint (`is_manual_entry_default = true`). |

Derived, never stored: `balance = opening_balance + Σ signed effect of transactions`
([FR-002](spec.md#fr-002)); the sign rule is `domain.ledger.signed_effect`.

Deletion is not in v1 ([Out of Scope](spec.md#out-of-scope)); every foreign key to Account uses
`PROTECT`.

### Category

| Field | Type | Rules |
|-------|------|-------|
| `name` | text | Unique within a side; the same name may exist on both sides ([FR-032](spec.md#fr-032)). |
| `colour` | text (hex) | Editable, including for protected categories ([FR-033](spec.md#fr-033)). |
| `side` | `Side` | Immutable after creation. |
| `protected_role` | `ProtectedRole` or null | At most one category per (side, role) — partial unique constraint. Protected categories cannot be deleted ([FR-033](spec.md#fr-033)). |

Deleting a non-protected category: transactions move to the same side's `uncategorised` category
and its budget is removed ([FR-034](spec.md#fr-034)). The move is done by the service before
deletion; `Transaction.category` uses `PROTECT` so nothing cascades by accident; `Budget.category`
uses `CASCADE`.

### Transaction

| Field | Type | Rules |
|-------|------|-------|
| `date` | date | Required ([FR-010](spec.md#fr-010)). |
| `amount` | decimal | `>= 0` (check constraint) ([FR-010](spec.md#fr-010)). |
| `description` | text | May be empty ([FR-010](spec.md#fr-010)). |
| `kind` | `Kind` | Required. |
| `account` | FK Account | Required; for a transfer, the source. |
| `category` | FK Category, nullable | Required for expense/income, must match the kind's side; null for transfer ([FR-011](spec.md#fr-011), [FR-015](spec.md#fr-015)). |
| `destination_account` | FK Account, nullable | Required for transfer and `!= account`; null otherwise ([FR-011](spec.md#fr-011)). |

Database check constraint: `(kind = 'transfer' AND category IS NULL AND destination_account IS
NOT NULL AND destination_account <> account) OR (kind <> 'transfer' AND category IS NOT NULL AND
destination_account IS NULL)`. Side-matching between `category.side` and `kind` crosses tables and
is enforced in the service layer with a test.

Signed effect on balances ([FR-002](spec.md#fr-002), [FR-012](spec.md#fr-012)): expense `−amount`
on `account`; income `+amount` on `account`; transfer `−amount` on `account` and `+amount` on
`destination_account`. Transfers never appear in spending, income, or budget figures.

A reconciliation ([FR-005](spec.md#fr-005)) is an ordinary Transaction of kind expense or income in
the side's `unaccounted` category, dated the reconciliation day, description "Reconciliation". There
is no reconciliation entity.

### Budget

| Field | Type | Rules |
|-------|------|-------|
| `category` | one-to-one FK Category | Must be `side = expense` and `protected_role IS NULL` ([FR-040](spec.md#fr-040)); enforced in the service layer with a test. |
| `monthly_limit` | decimal | `> 0`. |

The period is the calendar month ([FR-041](spec.md#fr-041)). No period field: the rule is one
function, `domain.budgets.period_containing(date)`, so the later period types listed under
[Out of Scope](spec.md#out-of-scope) are a change in one place.

### MappingProfile

| Field | Type | Rules |
|-------|------|-------|
| `name` | text | Unique. |
| `date_column` | text | Header name. Required ([FR-021](spec.md#fr-021)). |
| `amount_column` | text, nullable | One signed column, or |
| `debit_column`, `credit_column` | text, nullable | separate columns. Check constraint: exactly one of the two forms is set. |
| `description_column` | text | Required. |
| `counterparty_column` | text, nullable | When set, review groups by it ([FR-026](spec.md#fr-026)). |
| `date_format` | text | `strptime` pattern, e.g. `%d.%m.%Y`. |
| `decimal_separator` | `.` or `,` | |
| `encoding` | text | e.g. `utf-8`, `cp1252`, `iso-8859-1`. |

The column delimiter is detected per file, not stored ([research R-8](research.md#r-8-csv-parsing)).

### PendingBatch

| Field | Type | Rules |
|-------|------|-------|
| `account` | FK Account (PROTECT) | The account the rows will be booked to. |
| `profile` | FK MappingProfile (PROTECT) | |
| `source_filename` | text | Shown in the pending list. |
| `created_at` | datetime | |

A batch has no effect on balances, figures, or budgets ([FR-022](spec.md#fr-022)) because nothing
reads PendingRow outside the import screens. Batches persist until confirmed or discarded.

### PendingRow

| Field | Type | Rules |
|-------|------|-------|
| `batch` | FK PendingBatch (CASCADE) | |
| `row_number` | int | 1-based position in the file; unique within the batch. |
| `raw_line` | text | Kept so unparsable rows can be shown ([FR-028](spec.md#fr-028)). |
| `parse_error` | text, nullable | Set when the row could not be parsed; such rows are never confirmable. |
| `date` | date, nullable | Parsed value; null only when `parse_error` is set. |
| `amount` | decimal, nullable | Absolute value; the direction becomes `kind` ([FR-023](spec.md#fr-023)). |
| `description` | text | |
| `counterparty` | text, nullable | Vendor group key when the profile maps a counterparty column ([FR-026](spec.md#fr-026)). |
| `kind` | `Kind` | Proposed from the amount's direction; the user may change it to transfer ([FR-023](spec.md#fr-023)). |
| `category` | FK Category, nullable | The side's `uncategorised` on creation; never null while `kind` is expense/income ([FR-029](spec.md#fr-029)); null for transfer. |
| `destination_account` | FK Account, nullable | Set when the user marks the row as a transfer. |
| `is_duplicate` | bool | Computed on creation ([FR-024](spec.md#fr-024)). |
| `include` | bool | False on creation when `is_duplicate` or `parse_error`; the user can set it true for duplicates only ([FR-025](spec.md#fr-025)). |

Vendor groups are derived at read time: rows with the same `counterparty` (when not null) form a
group if there are at least two of them; everything else is presented ungrouped
([FR-026](spec.md#fr-026)).

## Relationships

```text
Account 1───* Transaction (account)
Account 1───* Transaction (destination_account, transfers only)
Category 1───* Transaction
Category 1───1 Budget (expense, non-protected only)
Account 1───* PendingBatch
MappingProfile 1───* PendingBatch
PendingBatch 1───* PendingRow
Category 1───* PendingRow
Account 1───* PendingRow (destination_account)
```

## State transitions

**PendingBatch**: `created` → `confirmed` (each row with `include = true` becomes a Transaction on
`batch.account` with the row's kind, category or destination, date, amount, description; then the
batch and its rows are deleted) or → `discarded` (batch and rows deleted; ledger untouched)
([FR-027](spec.md#fr-027)). There is no status column because a batch exists only while pending.

**Transaction kind change** ([FR-015](spec.md#fr-015)): expense ↔ income sets `category` to the
new side's `uncategorised` and keeps `destination_account` null; → transfer sets `category` null
and requires `destination_account`; transfer → expense/income sets `destination_account` null and
`category` to the new side's `uncategorised`. The UI performs these transitions; the service
rejects any state that violates the Transaction constraints.

**Category deletion** ([FR-034](spec.md#fr-034)): refuse when `protected_role` is set; otherwise
reassign transactions and pending rows to the side's `uncategorised`, then delete (budget cascades).

## Domain rules (pure Python, `backend/domain/`)

No module here imports Django (Constitution Principle VI; guarded by a test, see
[research R-9](research.md#r-9-testing)). Inputs and outputs are dataclasses and primitives.

| Module | Rule | Requirement |
|--------|------|-------------|
| `ledger.py` | `signed_effect(kind, amount, is_destination)`, `compute_balance(opening, effects)`, `validate(kind, category_side, destination)` | [FR-002](spec.md#fr-002), [FR-011](spec.md#fr-011), [FR-012](spec.md#fr-012) |
| `reconciliation.py` | `reconciliation_entry(computed, actual, today)` → expense/income entry in `unaccounted`, or none when equal | [FR-005](spec.md#fr-005) |
| `csv_import.py` | `detect_delimiter(header)`, `parse_rows(text, profile)` → parsed rows and per-row errors, `propose_kind(signed_amount)` | [FR-021](spec.md#fr-021), [FR-023](spec.md#fr-023), [FR-028](spec.md#fr-028) |
| `duplicates.py` | `flag_duplicates(rows, existing_keys, transfer_counter_keys)` on (account, date, amount) | [FR-024](spec.md#fr-024) |
| `grouping.py` | `group_by_counterparty(rows)` → groups of ≥ 2 rows plus ungrouped rows | [FR-026](spec.md#fr-026) |
| `budgets.py` | `period_containing(date)`, `most_recent_period_in(start, end)`, `progress(limit, spent)` | [FR-041](spec.md#fr-041), [FR-042](spec.md#fr-042), [Edge Cases](spec.md#edge-cases) |
| `insights.py` | `buckets(start, end)` (daily within one month, else monthly), `spending_over_time(...)`, `breakdown(...)` with shares | [FR-051](spec.md#fr-051), [FR-052](spec.md#fr-052), [R-13](research.md#r-13-points-the-spec-leaves-open) |

<a id="seed-data"></a>
## Seed data (data migration, [research R-12](research.md#r-12-first-launch-data))

**Account**: `Cash`, type `cash`, opening balance `0.00`, `is_manual_entry_default = true`
([FR-006](spec.md#fr-006)).

**Expense categories**: Groceries, Eating out, Transport, Housing, Utilities, Health, Leisure,
Shopping, Subscriptions, Travel, Gifts, plus protected `Uncategorised` and `Unaccounted`.

**Income categories**: Salary, Refunds, Gifts, Interest, Other income, plus protected
`Uncategorised` and `Unaccounted`.

Colours come from the shadcn chart palette (`--chart-1` … `--chart-5`) cycled, with the protected
pair in neutral greys so they read as "known unknowns" in charts ([FR-052](spec.md#fr-052)). The
non-protected lists are a planning choice, not a requirement
([R-13](research.md#r-13-points-the-spec-leaves-open)).
