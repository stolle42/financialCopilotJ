
## Clarifications

### Session 2026-09-25

- Q: Which account does manual entry default to when the user has no cash account? → A: One
  always exists: the app ships with a predefined "Cash" account, and manual entry defaults to it.
  If it no longer exists, default to the account most recently used for manual entry.
- Q: When the Insights period spans several calendar months, how is budget progress shown? → A:
  For the most recent calendar month in the period only.
- Q: Which view does the app open on? → A: The transaction list, for now; may change later.
- Q: When a bank file has no counterparty column, how does review decide two rows share a vendor?
  → A: In v1 it does not: rows are grouped only by a mapped counterparty column and are otherwise
  ungrouped. Deriving a vendor from the description is deferred
  ([Out of Scope](001-finance-tracker-v1/spec.md#out-of-scope)).
- Q: Can an expense or income be saved without a category? → A: No, and the UI never offers that
  state: the category holds the side's "Uncategorised" until the user picks another.
- Q: Can a transfer be given a category? → A: No; when the kind is transfer, the form shows a
  destination account in place of the category.
- Q: What does the manual-entry form hold when opened, and can it be saved as is? → A: Kind
  expense, date today, amount 0.00, account "Cash", category expense "Uncategorised", description
  empty. Saving unchanged books a 0.00 expense with no description to "Cash". Description is
  optional; a zero amount is allowed.
- Q: How is an opening balance changed? → A: Only after a severe warning that the user confirms.
- Q: Is reconciliation a way to enter a balance? → A: Yes; the user states the actual balance and
  the app books the difference as a transaction. What is forbidden is storing or editing the
  balance as a number of its own.
- Q: Is a row a duplicate when only its description differs? → A: Yes; duplicates match on
  account, date, and amount only.
- Q: How are unparsable and duplicate rows shown in review? → A: Low-prominence: they are kept out
  of the rows under review, review shows a count for each, and selecting the count presents them.
- Q: Can an imported row be confirmed without a category? → A: No; every row's category dropdown
  holds the side's "Uncategorised" until the user picks another.
