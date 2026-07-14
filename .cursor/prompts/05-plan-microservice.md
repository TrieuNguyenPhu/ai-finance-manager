# Plan a service or major capability

Plan: <CAPABILITY>

Before proposing a new microservice, evaluate whether it should be:
- a module in an existing service;
- a new deployable service;
- an asynchronous worker.

Base the decision on:
- data ownership and transaction boundaries;
- independent scaling;
- release cadence and team ownership;
- failure isolation;
- operational and AWS cost;
- expected traffic below 100 initial users.

Deliver:
1. recommended boundary and rationale;
2. API/event contracts;
3. data model;
4. security/privacy risks;
5. failure and retry behavior;
6. observability;
7. deployment and cost impact;
8. phased implementation plan;
9. rollback strategy.

Do not write code.
