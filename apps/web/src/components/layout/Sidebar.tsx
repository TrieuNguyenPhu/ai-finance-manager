"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/ai", label: "AI draft", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row overflow-x-auto",
      )}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
              active
                ? "bg-accent-soft font-medium text-accent-strong dark:text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar + mobile top bar for the authenticated app area. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link
          href="/"
          className="px-3 font-mono text-xs font-semibold tracking-[0.18em] text-accent-strong uppercase dark:text-accent"
        >
          ai-finance
          <span className="text-muted">-manager</span>
        </Link>
        <div className="mt-8 flex-1">
          <NavLinks orientation="vertical" />
        </div>
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] text-muted">Local dev</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link
            href="/"
            className="shrink-0 font-mono text-xs font-semibold tracking-[0.18em] text-accent-strong uppercase dark:text-accent"
          >
            afm
          </Link>
          <NavLinks orientation="horizontal" />
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
