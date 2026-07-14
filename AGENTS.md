# AGENTS.md

## Mission
Build a secure, maintainable, cost-aware personal finance platform using microservices.

## Working agreement
1. Read `.cursor/context/project.md`, `.cursor/context/architecture.md`, and the relevant scoped rules before editing.
2. Inspect existing code and tests before proposing changes.
3. For tasks larger than a small local edit, create a concise plan first.
4. Change only files required for the task. Do not opportunistically refactor unrelated code.
5. Never invent APIs, environment variables, database columns, events, or infrastructure resources. Verify them in the repository.
6. Never place secrets, credentials, tokens, account numbers, or real personal financial data in source code, logs, fixtures, prompts, or commits.
7. Run the smallest relevant validation first, then broader validation when justified.
8. Report:
   - files changed;
   - commands/tests run;
   - assumptions;
   - unresolved risks.
9. Do not claim success when tests were not run or failed.
10. Prefer simple, explicit code over speculative abstractions.

## Definition of done
- Acceptance criteria are satisfied.
- Relevant tests pass.
- Error paths and validation are covered.
- API/schema/event changes are documented.
- No secrets or sensitive financial data are exposed.
- The change is backward compatible unless the task explicitly approves a breaking change.
