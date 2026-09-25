# Financial copilot
## Cleand and tidy history
Do not commit vast amounts of work at once. Suggest a commit to the user on every atomic step of work. Use branches if necessary.
It must always be possible to checkout the project and keep developping on another machine. Files that are not necessary for that (e.g. because they are automatically generated) should be in gitignore. 
## Duplication is forbidden
Avoic creating information multiple times in markdown files. Instead create links to the original source (e.g. tasks do not restate the requirement, but link to the requirement instead).
## Code guidelines
## Code guidelines
When these conflict, KISS wins until the same logic exists in two places and changes for the same reason.
- KISS: make the smallest change that satisfies the current requirement.
- DRY: extract shared code only on the second real use.
- SOLID: one module, one reason to change. Introduce an interface only at a boundary you actually swap, such as a database or an external API.
- Clean Code: names say what the value is. A function does one thing. Comments explain why.
- TDD: for a behavior change, write a failing test, then the minimum code that passes, then refactor. Do not add production behavior without a test that fails if that behavior breaks.