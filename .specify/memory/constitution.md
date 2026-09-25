# Financial Copilot Constitution

## Core Principles

### I. Duplication Is Forbidden

Information MUST exist in exactly one markdown file. Any other document that needs it MUST
link to that original instead of restating it. A task does not restate its requirement; it
links to the requirement in the spec.

Rationale: restated text drifts from its source. One source means one place to change and one
place to read.

### II. KISS

Every change MUST be the smallest change that satisfies the current requirement. Code for a
requirement that does not yet exist MUST NOT be written.

### III. DRY

Shared code MUST be extracted only on the second real use. A single use, or a use that is
merely anticipated, is not grounds for an abstraction.

### IV. SOLID

One module has one reason to change. An interface MUST be introduced only at a boundary that is
actually swapped, such as a database or an external API. Elsewhere, call the concrete code.

### V. Clean Code

Names say what the value is. A function does one thing. Comments explain why, not what.

### VI. Clean Architecture

Dependencies MUST point inward. Business rules MUST NOT import from the web framework, the UI,
or the persistence layer; those outer layers depend on the business rules. A layer boundary
becomes an explicit interface only under the rule in Principle IV.

Rationale: business rules that run without a database or an HTTP request are cheap to test,
which is what makes Principle VII affordable.

### VII. TDD

For a behavior change: write a failing test, then the minimum code that passes, then refactor.
Production behavior MUST NOT be added without a test that fails if that behavior breaks.

## Precedence Between Code Principles

When Principles II–VII conflict, KISS (II) wins until the same logic exists in two places and
changes for the same reason. Only then do DRY (III) and SOLID (IV) justify the extraction or
the interface.

## Development Workflow

- A behavior change follows the cycle in Principle VII. The commit or pull request MUST show
  the test that fails without the change.
- An extraction, abstraction, or interface MUST name the second real use or the swapped
  boundary that justifies it (Principles III and IV, and the precedence rule above).
- A markdown change MUST link to existing information rather than restate it (Principle I).
- Commit granularity and repository hygiene are defined in [agents.md](../../agents.md).

## Governance

This constitution supersedes every other practice document in the repository where they
conflict.

- Amendment: change this file in its own commit, state the version bump and its rationale in
  the commit message, and update **Last Amended**.
- Versioning: MAJOR for removing or redefining a principle; MINOR for adding a principle or
  section, or materially expanding guidance; PATCH for clarifications and wording.
- Compliance: every review MUST check the change against Principles I–VII and the precedence
  rule. A deviation MUST be justified in the pull request or commit; an unjustified deviation
  is not mergeable.
- Agent runtime guidance lives in [agents.md](../../agents.md) and is subject to Principle I.

**Version**: 1.0.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-25
