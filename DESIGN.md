# ai-finance-manager design system

## Direction

**Quiet Ledger** treats personal finance as a calm review practice, not a trading
terminal. The interface should feel precise, private, and human: warm paper,
deep ink, restrained ledger green, and typography with an editorial hierarchy.

The product must be more useful than a visual showcase. Every screen should
answer one financial question, make the next safe action obvious, and keep the
ledger boundary visible without exposing infrastructure terminology.

## Product principles

1. **Review before record.** Financial mutations expose what will change before
   they are committed. AI output is always labelled as an unrecorded draft.
2. **Money is unambiguous.** Always show currency, sign, and tabular numerals.
   Never add balances from different currencies.
3. **Calm over decoration.** Hierarchy comes from type, rules, spacing, and
   contrast. Avoid gradients, glass effects, ornamental blobs, and generic card
   grids.
4. **Plain-language finance.** UI copy describes the user's money and action.
   Terms such as outbox, read model, minor unit, schema, and service stay out of
   product copy.
5. **The ledger is auditable.** Corrections are reversals, not edits. Success is
   quiet; destructive or irreversible-looking actions get explicit context.

## Visual language

- **Display:** Newsreader, upright only, for page statements and large financial
  summaries.
- **Body/UI:** Geist for navigation, controls, prose, and labels.
- **Numerals:** Geist with `font-variant-numeric: tabular-nums`; Geist Mono is
  reserved for technical identifiers, not general money display.
- **Palette:** warm paper and green-tinted neutrals; ledger green is the only
  brand accent. Positive, negative, and warning colours are semantic only.
- **Surfaces:** use open layouts and hairline rules first. A bordered surface is
  for a real grouping or interaction, not for every piece of content.
- **Radius:** 8 px controls, 12 px grouped surfaces, pill shape only for compact
  statuses.
- **Motion:** 120–240 ms, ease-out, one property-level response per interaction.
  No `transition-all`; every animation has a reduced-motion fallback.

## Layout

- Desktop application: a stable left rail plus a fluid content canvas. The
  first viewport uses asymmetric columns where the content warrants it.
- Mobile application: one content column and a five-item bottom navigation.
  Profile and theme remain in the top context bar. No horizontally scrolling
  primary navigation.
- Marketing: an off-axis editorial hero followed by ruled, numbered product
  evidence. Never use the generic hero / three cards / CTA template.
- Both `html` and `body` use `overflow-x: clip`. Validate at 320, 375, 414, 768,
  1280, and 1920 px.

## Interaction and accessibility

- Interactive controls provide default, hover, focus-visible, active, disabled,
  loading, error, and success behavior where applicable.
- The minimum primary control height is 44 px. Focus indicators appear
  immediately and meet 3:1 contrast.
- Do not communicate financial meaning with colour alone; pair it with a sign,
  label, icon, or status text.
- Use semantic landmarks, a skip link, live regions for asynchronous status,
  explicit progress-bar names, and native form controls where possible.
- Target WCAG 2.2 AA, 200% zoom, keyboard-only use, and reduced motion.

## Performance budget

- Keep production dependencies small; prefer CSS and existing Lucide icons over
  animation or chart libraries.
- Target route JavaScript <= 150 KiB gzip and CSS <= 35 KiB gzip.
- Marketing content must be statically renderable. Runtime health checks happen
  after hydration and never block the first response.
- Target p75 LCP <= 2.5 s, INP <= 200 ms, and CLS <= 0.1.

## Content rules

- Never invent balances, savings, testimonials, usage counts, or performance
  claims.
- Example transactions must be clearly labelled examples and contain no real
  financial or personal data.
- Preserve the display name `ai-finance-manager` and the guarantees: gateway-only
  browser access, confirm-before-save AI, integer minor units at API boundaries,
  and reversal-based corrections.
