# Review change prompt

Review the current diff as a senior engineer.

Prioritize:
1. correctness and financial invariants;
2. authentication, authorization, privacy, and secret exposure;
3. backward compatibility of APIs/events/migrations;
4. concurrency, idempotency, retries, and partial failures;
5. tests and observability;
6. AWS cost impact;
7. maintainability.

Return findings only when actionable. For each finding include:
- severity: blocker/high/medium/low;
- file and line;
- concrete failure scenario;
- recommended fix.

Then list validation gaps. Do not praise or summarize unchanged code.
