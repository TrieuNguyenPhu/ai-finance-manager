"use client";

import { FormEvent, useState } from "react";
import { PiggyBank } from "lucide-react";
import { createBudget, listBudgets } from "@/lib/api";
import { formatMinor, percentOf } from "@/lib/money";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  ProgressBar,
  SkeletonRows,
} from "@/components/ui";

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function BudgetsPage() {
  const { data: budgets, loading, error, refresh } = useAsyncData(listBudgets);
  const [categoryName, setCategoryName] = useState("Food");
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [limitMinor, setLimitMinor] = useState("2000000");
  const [currency, setCurrency] = useState("VND");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createBudget({
        categoryName,
        yearMonth,
        limitMinor: Number(limitMinor),
        currency,
        thresholdPercent: 80,
      });
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budgets"
        description="Monthly limits per category — spent amounts stream in from ledger events."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>New budget</CardTitle>
          <CardDescription>Alerts fire at 80% of the limit.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_8rem_auto]"
          >
            <Field label="Category">
              {(id) => (
                <Input
                  id={id}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Month">
              {(id) => (
                <Input
                  id={id}
                  type="month"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Limit (minor units)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={limitMinor}
                  onChange={(e) => setLimitMinor(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Currency">
              {(id) => (
                <Input
                  id={id}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  required
                />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="self-end">
              Add budget
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : !budgets || budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets yet"
          description="Set a monthly limit per category to see spending progress here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b, i) => {
            const percent = percentOf(b.spentMinor, b.limitMinor);
            const over = percent >= 100;
            const near = !over && percent >= b.thresholdPercent;
            return (
              <Card
                key={b.id}
                hover
                className="animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{b.categoryName}</p>
                    <Badge tone={over ? "negative" : near ? "warning" : "accent"}>
                      {over ? "Over limit" : near ? "Near limit" : "On track"} · {percent}%
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted">{b.yearMonth}</p>
                  <ProgressBar percent={percent} thresholdPercent={b.thresholdPercent} />
                  <div className="flex items-baseline justify-between font-mono text-sm">
                    <span>{formatMinor(b.spentMinor, b.currency)}</span>
                    <span className="text-muted">/ {formatMinor(b.limitMinor, b.currency)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
