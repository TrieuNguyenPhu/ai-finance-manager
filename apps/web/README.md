# web

Next.js + TypeScript frontend foundation.

Exposes `GET /api/health`. No authentication or finance features yet.

## Requirements

- Node.js 22+
- pnpm 10+

## Commands

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Default port: `3000` (`WEB_PORT` via `next dev -p`).
