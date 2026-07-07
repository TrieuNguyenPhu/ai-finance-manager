import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

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

const workflow = [
  {
    icon: Wallet,
    title: "1 · Create accounts",
    body: "Cash, bank, or e-wallet. Balances live in integer minor units and only move via ledger entries.",
    href: "/accounts",
  },
  {
    icon: Sparkles,
    title: "2 · Record spending",
    body: "Post entries directly, or type “coffee 45k” and let AI draft it. You always confirm before it counts.",
    href: "/transactions",
  },
  {
    icon: PiggyBank,
    title: "3 · Set budgets",
    body: "Monthly limits per category with threshold alerts, fed by ledger events.",
    href: "/budgets",
  },
  {
    icon: BarChart3,
    title: "4 · Watch the dashboard",
    body: "Income, expense, and net per month from the async analytics read model.",
    href: "/dashboard",
  },
];

export default async function HomePage() {
  const health = await getGatewayHealth();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_70%_-10%,var(--accent-soft)_0%,transparent_60%)]"
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-mono text-xs font-semibold tracking-[0.18em] text-accent-strong uppercase dark:text-accent">
          ai-finance-manager
        </span>
        <div className="flex items-center gap-3">
          <Badge tone={health.ok ? "positive" : "neutral"}>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                health.ok ? "bg-positive" : "bg-muted",
              )}
            />
            Gateway {health.ok ? "online" : health.detail}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col px-6 pt-16 pb-24 sm:pt-24">
        <div className="max-w-2xl animate-fade-up">
          <Badge tone="accent" className="mb-6">
            <ShieldCheck className="h-3 w-3" />
            AI drafts, you decide — confirm before save
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Track spending.
            <br />
            <span className="text-accent-strong dark:text-accent">Draft with AI.</span>
            <br />
            Confirm before it counts.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            A personal ledger with immutable entries, monthly budgets, and
            natural-language drafts — everything behind one gateway.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-accent-strong px-6 text-sm font-medium text-accent-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:brightness-110"
            >
              Open the app
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/ai"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-6 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:bg-surface-2"
            >
              <Sparkles className="h-4 w-4 text-accent-strong dark:text-accent" />
              Try an AI draft
            </Link>
          </div>
        </div>

        <section aria-label="How it works" className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((step, i) => (
            <Link
              key={step.href}
              href={step.href}
              className="group animate-fade-up rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_12px_32px_rgb(0_0_0/0.08)]"
              style={{ animationDelay: `${150 + i * 80}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft transition-transform duration-300 group-hover:scale-110">
                <step.icon className="h-5 w-5 text-accent-strong dark:text-accent" />
              </div>
              <h2 className="mt-4 text-sm font-semibold">{step.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">{step.body}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
