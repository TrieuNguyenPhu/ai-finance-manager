Shared API and event contracts for ai-finance-manager.

- `gateway-openapi.yaml` — complete browser-facing BFF route surface.
- `events/ledger-entry-posted-v1.schema.json` — additive v1 payload emitted by the
  transaction-service outbox.
- Domain services may diverge internally; gateway remains the public contract.

## Ledger impact event v1

`transaction.ledger_entry.posted` keeps its stable event type and carries
`eventVersion: 1`. The payload `eventId` is the same UUID as the outbox/envelope
ID. Consumers must reject mismatched v1 IDs and deduplicate by that canonical ID.

The producer, not each read model, defines signed reporting effects:

| Ledger operation | income delta | expense delta | category-spend delta |
|---|---:|---:|---:|
| income | `+amount` | `0` | `0` |
| expense | `0` | `+amount` | `+amount` |
| transfer | `0` | `0` | `0` |
| reversal | exact negative of the original entry's three deltas | | |

For a reversal, `effectEntryType`, category identity, `effectiveOccurredAt`, and
`yearMonth` refer to the original entry whose effect is being cancelled. This
makes addition commutative: duplicate delivery is handled by the consumer inbox,
and original/reversal delivery order does not change the final projection.

Budget progress is projected independently of budget-limit rows. A budget made
after an expense therefore reads the already accumulated category spend. New
clients should send `categoryId` when creating a budget; `categoryName` remains
supported as a legacy grouping key during the UI migration.

Deployment note: v0 reversal events do not contain enough information to recover
their original effect, and v0 categorized expenses do not carry the category
name required by the new budget projection. Consumers reject those ambiguous
events rather than corrupt a projection. Any environment that already processed
v0 events must rebuild the analytics and budget read models from ledger entries
as v1 impacts during rollout. The ledger remains the source of truth; this change
does not rewrite ledger rows. The budget migration also stops with an explicit
error when legacy rows collide case-insensitively (for example `Food` and
`food`); merge those rows before applying it. An executable rebuild/backfill
command is still a release blocker.
