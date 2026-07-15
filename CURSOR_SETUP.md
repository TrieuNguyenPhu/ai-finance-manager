# Cursor setup for the personal-finance project

This file is for **Cursor agent kit** configuration. For product setup, use the root `README.md`.

## 1. Copy the kit
Copy `.cursor/`, `.cursorignore`, `.cursorindexingignore`, `AGENTS.md`, and `.env.example` into the repository root.

## 2. Review architecture context
Edit:
- `.cursor/context/project.md`
- `.cursor/context/architecture.md`
- `.cursor/context/commands.md`

Keep these files short and factual. They must match ADR 0003 (controlled microservices).

## 3. Rules
Rules are split by scope:
- `00-*` and `01-*`: always active.
- language/framework rules: loaded only for matching files.
- infra/database/API/testing/docs rules: loaded only when relevant.

Do not combine every rule into one huge always-on file.

## 4. Ignore files
- `.cursorignore`: prevents Cursor from accessing matching files.
- `.cursorindexingignore`: excludes content from indexing while still allowing explicit access when needed.

## 5. MCP
`mcp.example.json` is intentionally disabled. Copy only approved entries into `.cursor/mcp.json`.

## 6. Recommended working cycle
1. Use Plan mode for a multi-file or architectural task.
2. Start a new chat for an unrelated task.
3. Paste one concrete goal and acceptance criteria.
4. Let Agent inspect before editing.
5. Ask for targeted tests.
6. Review the diff manually.
7. Use `.cursor/prompts/04-review-change.md`.
8. Commit a small coherent change.

## 7. First prompt
Run `.cursor/prompts/01-bootstrap-repository.md` before coding. Review findings against ADR 0003.

## 8. Human review gates
Always review manually before:
- database migrations;
- IAM/network changes;
- authentication/authorization;
- ledger or balance calculations;
- event schema changes;
- production deployment;
- AI tools that can mutate external systems.
