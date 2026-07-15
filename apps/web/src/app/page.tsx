const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function getGatewayHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { status?: string; service?: string };
    return {
      ok: data.status === "ok",
      detail: data.service ?? data.status ?? "unknown",
    };
  } catch {
    return { ok: false, detail: "unreachable" };
  }
}

export default async function HomePage() {
  const health = await getGatewayHealth();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_55%),linear-gradient(180deg,_#f7f4ef_0%,_#ebe6de_100%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-sm tracking-[0.2em] text-accent uppercase">
          ai-finance-manager
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Track spending. Draft with AI. Confirm before it counts.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Personal finance with Java ledger, Go analytics/budgets, and Python AI —
          all behind gateway-service. AI suggests; you confirm before ledger writes.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="#setup"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Local setup
          </a>
          <span
            className={`rounded-md border px-3 py-2 font-mono text-xs ${
              health.ok
                ? "border-teal-700/30 bg-surface text-teal-800"
                : "border-stone-300 bg-surface text-muted"
            }`}
          >
            Gateway: {health.ok ? "online" : health.detail}
          </span>
        </div>
        <section id="setup" className="mt-16 border-t border-stone-300/70 pt-8">
          <h2 className="text-lg font-medium text-foreground">Run locally</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>
              Gateway:{" "}
              <code className="font-mono text-foreground">
                cd services/gateway-service && uv sync && uv run uvicorn
                gateway.main:app --reload --app-dir src --port 8000
              </code>
            </li>
            <li>
              Web:{" "}
              <code className="font-mono text-foreground">
                cd apps/web && pnpm install && pnpm dev
              </code>
            </li>
            <li>
              Open{" "}
              <code className="font-mono text-foreground">http://localhost:3000</code>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
