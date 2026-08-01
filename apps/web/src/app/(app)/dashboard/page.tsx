"use client";

import { BarChart3, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { getDashboard, type DashboardRow } from "@/lib/api";
import { formatMinor, formatSignedMinor } from "@/lib/money";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  SkeletonRows,
} from "@/components/ui";
import { cn } from "@/lib/cn";

function groupRowsByCurrency(rows: DashboardRow[]) {
  const groups = new Map<string, DashboardRow[]>();

  for (const row of rows) {
    const group = groups.get(row.currency) ?? [];
    group.push(row);
    groups.set(row.currency, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function latestRow(rows: DashboardRow[]) {
  return rows.reduce((latest, row) =>
    row.yearMonth > latest.yearMonth ? row : latest,
  );
}

function displayAmount(amountMinor: number, currency: string) {
  try {
    return formatMinor(amountMinor, currency);
  } catch {
    return `${amountMinor} ${currency}`;
  }
}

function displaySignedAmount(amountMinor: number, currency: string) {
  try {
    return formatSignedMinor(amountMinor, currency);
  } catch {
    return `${amountMinor > 0 ? "+" : ""}${amountMinor} ${currency}`;
  }
}

function loadedLabel(count: number) {
  return `${count} row${count === 1 ? "" : "s"} loaded`;
}

export default function DashboardPage() {
  const { data: rows, loading, error, refresh } = useAsyncData(getDashboard);
  const currencyGroups = groupRowsByCurrency(rows ?? []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description="Currency-separated cash flow from the analytics read model, updated asynchronously from ledger events."
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry dashboard
          </Button>
        </div>
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No aggregates loaded"
          description="Post a transaction first; the analytics service will pick it up from ledger events."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {currencyGroups.map(([currency, currencyRows]) => {
            const latest = latestRow(currencyRows);
            return (
              <section
                key={currency}
                aria-labelledby={`dashboard-${currency}`}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h2 id={`dashboard-${currency}`} className="font-display text-2xl font-medium">
                      {currency} cash flow
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Latest month: {latest.yearMonth}; values are not converted across currencies.
                    </p>
                  </div>
                  <Badge tone="neutral">{loadedLabel(currencyRows.length)}</Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label={`Income · ${latest.yearMonth}`}
                    value={displayAmount(latest.incomeMinor, currency)}
                    icon={<TrendingUp className="h-4 w-4 text-positive" aria-hidden />}
                    delay={0}
                  />
                  <StatCard
                    label={`Expense · ${latest.yearMonth}`}
                    value={displayAmount(latest.expenseMinor, currency)}
                    icon={<TrendingDown className="h-4 w-4 text-negative" aria-hidden />}
                    delay={60}
                  />
                  <StatCard
                    label={`Net · ${latest.yearMonth}`}
                    value={displaySignedAmount(latest.netMinor, currency)}
                    valueClass={latest.netMinor >= 0 ? "text-positive" : "text-negative"}
                    icon={<Scale className="h-4 w-4 text-muted" aria-hidden />}
                    delay={120}
                  />
                </div>

                <Card className="animate-fade-up [animation-delay:180ms]">
                  <CardContent className="overflow-hidden p-0">
                    <ul className="divide-y divide-border">
                      {currencyRows.map((row) => {
                        const total = Math.max(row.incomeMinor, row.expenseMinor, 1);
                        return (
                          <li
                            key={`${row.yearMonth}-${row.currency}`}
                            className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="font-mono text-sm font-medium">{row.yearMonth}</p>
                              <p
                                className={cn(
                                  "font-mono text-sm",
                                  row.netMinor >= 0 ? "text-positive" : "text-negative",
                                )}
                              >
                                {displaySignedAmount(row.netMinor, currency)}
                              </p>
                            </div>
                            <MiniBar
                              label="income"
                              amount={displayAmount(row.incomeMinor, currency)}
                              percent={(Math.max(0, row.incomeMinor) / total) * 100}
                              barClass="bg-positive"
                            />
                            <MiniBar
                              label="expense"
                              amount={displayAmount(row.expenseMinor, currency)}
                              percent={(Math.max(0, row.expenseMinor) / total) * 100}
                              barClass="bg-negative"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueClass,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
  delay: number;
}) {
  return (
    <Card hover className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted">{label}</p>
          {icon}
        </div>
        <p className={cn("font-mono text-xl font-semibold tracking-tight", valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniBar({
  label,
  amount,
  percent,
  barClass,
}: {
  label: string;
  amount: string;
  percent: number;
  barClass: string;
}) {
  const boundedPercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span className="w-14 shrink-0 text-[11px] text-muted sm:w-16">{label}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full opacity-80 transition-[width] duration-700 ease-out", barClass)}
          style={{ width: `${boundedPercent}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-muted sm:w-36">
        {amount}
      </span>
    </div>
  );
}
