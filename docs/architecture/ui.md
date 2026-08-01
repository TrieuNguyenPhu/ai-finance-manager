# UI direction (ai-finance-manager)

## Stack
Next.js App Router + TypeScript 5.9 + Tailwind. Prefer the repository's small
native component layer, CSS, and server/browser primitives. Add a dependency
only when it removes more complexity than it introduces and stays inside the
performance budget in [`DESIGN.md`](../../DESIGN.md).

## Look
The canonical direction is **Quiet Ledger**: warm paper, deep ink, restrained
ledger green, asymmetric editorial hierarchy, and one job per screen. See
[`DESIGN.md`](../../DESIGN.md) for tokens, interaction rules, responsive
breakpoints, accessibility, content rules, and performance budgets.

## Screens (order)
Auth → Dashboard → Transactions → Accounts → Budgets → AI Assistant (preview + Confirm/Cancel).

Brand mark: **ai-finance-manager** hero-level on marketing surfaces.
