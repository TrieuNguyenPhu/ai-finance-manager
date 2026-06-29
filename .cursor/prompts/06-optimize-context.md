# Context reset / continuation prompt

We are continuing an existing task. Reconstruct only the minimum needed context.

1. Read the task specification and current diff.
2. Inspect only changed files, their direct interfaces/callers, and relevant tests.
3. Summarize:
   - goal;
   - completed work;
   - remaining work;
   - failing checks;
   - decisions that must not be reversed.
4. Continue from the next incomplete step.

Do not re-explain the whole repository or reopen unrelated files.
