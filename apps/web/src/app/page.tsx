import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const ledgerRules = [
  "AI prepares an unrecorded draft.",
  "You review the account, amount, and type.",
  "Only confirmation changes the ledger.",
  "Corrections remain visible as reversals.",
];

const workflow = [
  {
    number: "01",
    label: "Accounts",
    title: "Give every balance a home.",
    body: "Keep cash, bank, and e-wallet accounts separate, with currency attached to every balance.",
    href: "/accounts",
    action: "Open accounts",
  },
  {
    number: "02",
    label: "Ledger",
    title: "Record changes, not guesses.",
    body: "Income, expenses, transfers, and reversals create an audit trail you can follow later.",
    href: "/transactions",
    action: "Open ledger",
  },
  {
    number: "03",
    label: "Budgets",
    title: "Set a limit before it becomes a surprise.",
    body: "Watch category spending against a monthly boundary and see when attention is needed.",
    href: "/budgets",
    action: "Review budgets",
  },
  {
    number: "04",
    label: "Monthly view",
    title: "Read the month as one story.",
    body: "Compare income, outflow, and net movement without combining unrelated currencies.",
    href: "/dashboard",
    action: "View the month",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-5 py-4 sm:px-8 lg:grid-cols-[1fr_1fr_auto] lg:px-10">
        <Link
          href="/"
          className="w-fit font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          ai-finance-manager
        </Link>
        <p className="hidden text-center text-xs font-medium tracking-[0.14em] text-muted uppercase lg:block">
          A ledger with a human in the loop
        </p>
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px"
          >
            Open app
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content">
        <section
          aria-labelledby="home-heading"
          className="mx-auto grid max-w-7xl border-b border-border lg:grid-cols-[minmax(0,7fr)_minmax(20rem,5fr)]"
        >
          <div className="px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24 lg:px-10 lg:pt-24 lg:pb-28">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent-strong uppercase">
              Personal finance · without autopilot
            </p>
            <h1
              id="home-heading"
              className="mt-6 max-w-[12ch] [overflow-wrap:anywhere] font-display text-5xl font-medium leading-[0.98] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-7xl"
            >
              Your money deserves a paper trail.
            </h1>
            <p className="mt-7 max-w-[58ch] text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Track accounts, record transactions, and read each month clearly. AI can prepare the
              draft; only you can put it on the books.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-lg border border-accent-strong bg-accent-strong px-5 text-sm font-semibold text-accent-foreground transition-[background-color,border-color] duration-150 hover:border-accent hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px"
              >
                Enter your ledger
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/ai"
                className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-[background-color,border-color] duration-150 hover:border-muted/70 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px"
              >
                <Sparkles className="h-4 w-4 text-accent-strong" aria-hidden />
                Draft from words
              </Link>
            </div>
          </div>

          <aside className="flex flex-col justify-between bg-surface-inverse px-5 py-10 text-surface-inverse-foreground sm:px-8 sm:py-12 lg:px-10 lg:py-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-inverse-accent uppercase">
                The boundary that matters
              </p>
              <h2 className="mt-5 max-w-[14ch] font-display text-3xl font-medium leading-tight sm:text-4xl">
                Nothing counts until you say so.
              </h2>
            </div>
            <ol className="mt-12 border-t border-surface-inverse-foreground/20">
              {ledgerRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-3 border-b border-surface-inverse-foreground/20 py-4 text-sm leading-6"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-inverse-accent" aria-hidden />
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section aria-labelledby="workflow-heading" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <div className="grid gap-6 border-b border-border pb-8 sm:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] sm:items-end">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent-strong uppercase">
              Four deliberate steps
            </p>
            <h2 id="workflow-heading" className="max-w-[18ch] font-display text-3xl font-medium leading-tight sm:text-5xl">
              A financial routine you can explain to yourself.
            </h2>
          </div>

          <ol className="grid sm:grid-cols-2">
            {workflow.map((step) => (
              <li
                key={step.number}
                className="border-b border-border py-8 sm:nth-[odd]:border-r sm:nth-[odd]:pr-8 sm:nth-[even]:pl-8 lg:py-10"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="money-figure text-xs font-semibold text-accent-strong">
                    {step.number}
                  </span>
                  <span className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                    {step.label}
                  </span>
                </div>
                <h3 className="mt-8 max-w-[19ch] font-display text-2xl font-medium leading-tight sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[55ch] text-sm leading-6 text-muted">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-6 inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-accent-strong hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                >
                  {step.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-accent-soft">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,8fr)_auto] lg:items-center lg:px-10 lg:py-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-accent-strong uppercase">
                Start with what is true today
              </p>
              <h2 className="mt-4 max-w-[18ch] font-display text-3xl font-medium leading-tight sm:text-4xl">
                One account. One entry. A clearer month.
              </h2>
            </div>
            <Link
              href="/accounts"
              className="inline-flex h-12 w-fit items-center gap-2 whitespace-nowrap rounded-lg border border-accent-strong bg-accent-strong px-5 text-sm font-semibold text-accent-foreground transition-[background-color,border-color] duration-150 hover:border-accent hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px"
            >
              Create an account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p>ai-finance-manager</p>
        <p>AI drafts. You review. The ledger records.</p>
      </footer>
    </div>
  );
}
