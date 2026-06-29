# Bootstrap repository prompt

You are bootstrapping this repository.

Read:
- `AGENTS.md`
- `.cursor/context/project.md`
- `.cursor/context/architecture.md`
- all relevant `.cursor/rules/*.mdc`

Then inspect the current repository without editing.

Produce:
1. A concise map of existing modules/services and their responsibilities.
2. Actual build, lint, test, and run commands discovered from repository files.
3. Mismatches between the repository and documented architecture.
4. The five highest-priority setup tasks.
5. A proposed implementation plan with small reviewable commits.

Constraints:
- Do not generate code yet.
- Do not assume missing tools or services exist.
- Cite file paths for every important conclusion.
- Keep the response under 1,000 words.
