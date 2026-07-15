"use client";

import { BarChart3, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { getDashboard } from "@/lib/api";
import { formatMinor, formatSignedMinor } from "@/lib/money";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  Alert,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  SkeletonRows,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const { data: rows, loading, error } = useAsyncData(getDashboard);
  const latest = rows?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Analytics read model updated asynchronously from ledger outbox events."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No aggregates yet"
          description="Post a transaction first — the analytics service will pick it up from the ledger events."
        />
      ) : (
        <>
          {latest ? (
            <section
              aria-label={`Summary for ${latest.yearMonth}`}
              className="grid gap-4 sm:grid-cols-3"
            >
              <StatCard
                label={`Income · ${latest.yearMonth}`}
                value={formatMinor(latest.incomeMinor, latest.currency)}
                icon={<TrendingUp className="h-4 w-4 text-positive" />}
                delay={0}
              />
              <StatCard
                label={`Expense · ${latest.yearMonth}`}
                value={formatMinor(latest.expenseMinor, latest.currency)}
                icon={<TrendingDown className="h-4 w-4 text-negative" />}
                delay={60}
              />
              <StatCard
                label={`Net · ${latest.yearMonth}`}
                value={formatSignedMinor(latest.netMinor, latest.currency)}
                valueClass={latest.netMinor >= 0 ? "text-positive" : "text-negative"}
                icon={<Scale className="h-4 w-4 text-muted" />}
                delay={120}
              />
            </section>
          ) : null}

          <Card className="animate-fade-up [animation-delay:180ms]">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {rows.map((row) => {
                  const total = Math.max(row.incomeMinor, row.expenseMinor, 1);
                  return (
                    <li
                      key={`${row.yearMonth}-${row.currency}`}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-2/60"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-sm font-medium">
                          {row.yearMonth} · {row.currency}
                        </p>
                        <p
                          className={cn(
                            "font-mono text-sm",
                            row.netMinor >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {formatSignedMinor(row.netMinor, row.currency)}
                        </p>
                      </div>
                      <MiniBar
                        label="income"
                        amount={formatMinor(row.incomeMinor, row.currency)}
                        percent={(row.incomeMinor / total) * 100}
                        barClass="bg-positive"
                      />
                      <MiniBar
                        label="expense"
                        amount={formatMinor(row.expenseMinor, row.currency)}
                        percent={(row.expenseMinor / total) * 100}
                        barClass="bg-negative"
                      />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
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
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">{label}</p>
          {icon}
        </div>
        <p className={cn("font-mono text-xl font-semibold tracking-tight", valueClass)}>
          {value}
        </p>
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
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-[11px] text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full opacity-80 transition-[width] duration-700 ease-out", barClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-36 text-right font-mono text-[11px] text-muted">{amount}</span>
    </div>
  );
}
