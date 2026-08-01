"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GatewayStatus } from "@/components/status/GatewayStatus";

const links = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", mobileLabel: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", mobileLabel: "Entries", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", mobileLabel: "Budgets", icon: PiggyBank },
  { href: "/ai", label: "AI draft", mobileLabel: "Draft", icon: Sparkles },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="mt-7 flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus active:translate-y-px",
              active
                ? "bg-surface-inverse text-surface-inverse-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {links.map(({ href, mobileLabel, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap px-1 text-[10px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus active:bg-surface-2",
              active ? "text-accent-strong" : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Stable desktop rail, compact mobile context bar, and safe-area bottom navigation. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-5 py-6 lg:flex">
        <Link
          href="/"
          className="w-fit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <span className="block text-sm font-semibold tracking-[-0.02em] text-foreground">
            ai-finance-manager
          </span>
          <span className="mt-1 block text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
            Quiet ledger
          </span>
        </Link>

        <Link
          href="/transactions"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-accent-strong bg-accent-strong px-4 text-sm font-semibold text-accent-foreground transition-[background-color,border-color] duration-150 hover:border-accent hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New transaction
        </Link>

        <DesktopNavigation />

        <div className="mt-auto border-t border-border pt-5">
          {process.env.NODE_ENV === "development" ? <GatewayStatus /> : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href="/profile"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted transition-[background-color,color] duration-150 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus active:translate-y-px"
            >
              <UserRound className="h-4 w-4" aria-hidden />
              Profile
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:h-16 lg:px-8">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus lg:hidden"
          >
            ai-finance-manager
          </Link>
          <p className="hidden text-xs font-medium tracking-[0.12em] text-muted uppercase lg:block">
            Review before record
          </p>

          <div className="flex items-center gap-1.5">
            <Link
              href="/ai"
              className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px sm:inline-flex lg:flex"
            >
              <Sparkles className="h-4 w-4 text-accent-strong" aria-hidden />
              Draft with AI
            </Link>
            <Link
              href="/profile"
              aria-label="Open profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-[background-color,color] duration-150 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px lg:hidden"
            >
              <UserRound className="h-4 w-4" aria-hidden />
            </Link>
            <span className="lg:hidden">
              <ThemeToggle />
            </span>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl px-4 pt-7 pb-24 sm:px-6 sm:pt-9 lg:px-8 lg:pt-10 lg:pb-12"
        >
          {children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
