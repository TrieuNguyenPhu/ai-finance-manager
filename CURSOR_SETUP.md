# Cursor setup for the personal-finance project

## 1. Copy the kit
Copy `.cursor/`, `.cursorignore`, `.cursorindexingignore`, `AGENTS.md`, and `.env.example` into the repository root.

## 2. Review architecture context
Edit:
- `.cursor/context/project.md`
- `.cursor/context/architecture.md`
- `.cursor/context/commands.md`

Keep these files short and factual. Remove planned technologies that the repository does not actually use.

## 3. Rules
Rules are split by scope:
- `00-*` and `01-*`: always active.
- language/framework rules: loaded only for matching files.
- infra/database/API/testing/docs rules: loaded only when relevant.

Do not combine every rule into one huge always-on file. Scoped rules reduce irrelevant context and contradictory instructions.

## 4. Ignore files
- `.cursorignore`: prevents Cursor from accessing matching files. Keep secrets and large/generated content here.
- `.cursorindexingignore`: excludes content from indexing while still allowing explicit access when needed.

Review the patterns before use. Remove a pattern if Cursor must inspect that file type, such as a lockfile during dependency debugging.

## 5. MCP
`mcp.example.json` is intentionally disabled. Copy only approved entries into `.cursor/mcp.json`.

Security:
- use environment-variable interpolation;
- never commit credentials;
- give database tools read-only accounts;
- enable only tools needed for the current task;
- review third-party MCP source and permissions.

Package names and MCP interfaces can change. Verify the chosen server in its official repository or Cursor Marketplace before enabling it.

## 6. Recommended working cycle
1. Use Plan mode for a multi-file or architectural task.
2. Start a new chat for an unrelated task.
3. Paste one concrete goal and acceptance criteria.
4. Let Agent inspect before editing.
5. Ask for targeted tests.
6. Review the diff manually.
7. Use `.cursor/prompts/04-review-change.md`.
8. Commit a small coherent change.

## 7. Prompt shape that saves tokens

Use:

```text
Goal: <one outcome>

Acceptance criteria:
- ...
- ...

Relevant scope:
- service/path
- contract/path

Constraints:
- do not change ...
- preserve compatibility
- use existing dependencies

Verification:
- run <targeted command>
```

Avoid:
- repeating the entire project architecture in every prompt;
- saying “scan the whole codebase”;
- asking for code and a long tutorial in the same message;
- combining unrelated features;
- pasting full logs when the last error block and command are enough.

## 8. First prompt
Run `.cursor/prompts/01-bootstrap-repository.md` before coding. Review its findings and update the context files so future tasks use verified commands and boundaries.

## 9. Human review gates
Always review manually before:
- database migrations;
- IAM/network changes;
- authentication/authorization;
- ledger or balance calculations;
- event schema changes;
- production deployment;
- AI tools that can mutate external systems.
