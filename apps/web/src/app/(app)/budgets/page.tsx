"use client";

import { FormEvent, useRef, useState } from "react";
import { PiggyBank } from "lucide-react";
import { createBudget, listBudgets, listCategories, type Budget, type Category } from "@/lib/api";
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
  Select,
  SkeletonRows,
} from "@/components/ui";

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function groupBudgetsByCurrency(budgets: Budget[]) {
  const groups = new Map<string, Budget[]>();

  for (const budget of budgets) {
    const group = groups.get(budget.currency) ?? [];
    group.push(budget);
    groups.set(budget.currency, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function loadedLabel(count: number) {
  return `${count} budget${count === 1 ? "" : "s"} loaded`;
}

function loadedRowLabel(count: number) {
  return `${count} row${count === 1 ? "" : "s"} loaded`;
}

function safeBudgetPercent(spentMinor: number, limitMinor: number) {
  if (!Number.isSafeInteger(spentMinor) || !Number.isSafeInteger(limitMinor) || limitMinor <= 0) {
    return 0;
  }
  return percentOf(Math.max(0, spentMinor), limitMinor);
}

function safeThresholdPercent(value: number) {
  if (!Number.isFinite(value)) return 80;
  return Math.min(100, Math.max(0, value));
}

function displayAmount(amountMinor: number, currency: string) {
  try {
    return formatMinor(amountMinor, currency);
  } catch {
    return `${amountMinor} ${currency}`;
  }
}

export default function BudgetsPage() {
  const {
    data: budgets,
    loading: budgetsLoading,
    error: budgetsError,
    refresh: refreshBudgets,
  } = useAsyncData(listBudgets);
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
  } = useAsyncData(listCategories);

  const [categoryId, setCategoryId] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [limitMinor, setLimitMinor] = useState("2000000");
  const [currency, setCurrency] = useState("VND");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const budgetRequestKey = useRef<string | null>(null);

  const selectedCategoryId = categoryId || categories?.[0]?.id || "";
  const selectedCategory = categories?.find((category) => category.id === selectedCategoryId);
  const budgetGroups = groupBudgetsByCurrency(budgets ?? []);

  function changeBudgetIntent(update: () => void) {
    budgetRequestKey.current = null;
    setFormError(null);
    update();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!selectedCategory) {
      setFormError("Create or load a category before adding a budget");
      return;
    }

    const parsedLimitMinor = Number(limitMinor);
    if (!Number.isSafeInteger(parsedLimitMinor) || parsedLimitMinor < 0) {
      setFormError("Limit must be a non-negative integer in minor units");
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      setFormError("Use a valid three-letter currency code");
      return;
    }

    setSubmitting(true);
    const idempotencyKey = budgetRequestKey.current ?? crypto.randomUUID();
    budgetRequestKey.current = idempotencyKey;

    try {
      await createBudget(
        {
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          yearMonth,
          limitMinor: parsedLimitMinor,
          currency: normalizedCurrency,
          thresholdPercent: 80,
        },
        idempotencyKey,
      );
      budgetRequestKey.current = null;
      await refreshBudgets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Budget creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Budgets"
        description="Category-backed monthly limits with exact minor-unit amounts and currency-separated progress."
      />

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>New budget</CardTitle>
          <CardDescription>Limits are stored as integer minor units; alerts fire at 80%.</CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesError ? (
            <div className="mb-4 flex flex-col items-start gap-3">
              <Alert tone="error">{categoriesError}</Alert>
              <Button variant="secondary" size="sm" onClick={() => void refreshCategories()}>
                Retry categories
              </Button>
            </div>
          ) : null}
          {!categoriesLoading && !categoriesError && categories?.length === 0 ? (
            <Alert tone="info" className="mb-4">
              No categories are available. Create one from the Accounts page before setting a budget.
            </Alert>
          ) : null}
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_8rem_auto]"
          >
            <Field label="Category" hint="Loaded from the ledger service">
              {(id) => (
                <Select
                  id={id}
                  value={selectedCategoryId}
                  onChange={(event) =>
                    changeBudgetIntent(() => setCategoryId(event.target.value))
                  }
                  disabled={categoriesLoading || !!categoriesError || !categories?.length || submitting}
                  required
                >
                  {!categories?.length ? (
                    <option value="">No categories available</option>
                  ) : null}
                  {categories?.map((category: Category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.kind.toLowerCase()})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Month">
              {(id) => (
                <Input
                  id={id}
                  type="month"
                  value={yearMonth}
                  onChange={(event) =>
                    changeBudgetIntent(() => setYearMonth(event.target.value))
                  }
                  disabled={submitting}
                  required
                />
              )}
            </Field>
            <Field label="Limit (minor units)" hint="Whole number, no floating point">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={limitMinor}
                  onChange={(event) =>
                    changeBudgetIntent(() => setLimitMinor(event.target.value))
                  }
                  disabled={submitting}
                  required
                />
              )}
            </Field>
            <Field label="Currency" hint="ISO 4217">
              {(id) => (
                <Input
                  id={id}
                  value={currency}
                  onChange={(event) =>
                    changeBudgetIntent(() => setCurrency(event.target.value.toUpperCase()))
                  }
                  minLength={3}
                  maxLength={3}
                  disabled={submitting}
                  required
                />
              )}
            </Field>
            <Button
              type="submit"
              loading={submitting}
              disabled={categoriesLoading || !!categoriesError || !selectedCategory}
              className="self-end"
            >
              Add budget
            </Button>
          </form>
          {formError ? (
            <Alert tone="error" className="mt-4">
              {formError}. Retry without changing the form to safely reuse this request.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="budget-progress-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="budget-progress-heading" className="font-display text-2xl font-medium">
              Budget progress
            </h2>
            <p className="mt-1 text-sm text-muted">Currencies remain isolated so progress never implies conversion.</p>
          </div>
          {!budgetsLoading && !budgetsError && budgets ? (
            <Badge tone="neutral">{loadedLabel(budgets.length)}</Badge>
          ) : null}
        </div>

        {budgetsLoading ? (
          <SkeletonRows rows={3} />
        ) : budgetsError ? (
          <div className="flex flex-col items-start gap-3">
            <Alert tone="error">{budgetsError}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void refreshBudgets()}>
              Retry budgets
            </Button>
          </div>
        ) : !budgets || budgets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No budgets loaded"
            description="Set a monthly limit per category to see spending progress here."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {budgetGroups.map(([groupCurrency, currencyBudgets]) => (
              <section key={groupCurrency} aria-labelledby={`budget-currency-${groupCurrency}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3
                    id={`budget-currency-${groupCurrency}`}
                    className="font-mono text-sm font-semibold"
                  >
                    {groupCurrency}
                  </h3>
                  <span className="text-xs text-muted">
                    {loadedRowLabel(currencyBudgets.length)}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {currencyBudgets.map((budget, index) => {
                    const percent = safeBudgetPercent(budget.spentMinor, budget.limitMinor);
                    const threshold = safeThresholdPercent(budget.thresholdPercent);
                    const over = percent >= 100;
                    const near = !over && percent >= threshold;
                    return (
                      <Card
                        key={budget.id}
                        hover
                        className="animate-fade-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardContent className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{budget.categoryName}</p>
                            <Badge tone={over ? "negative" : near ? "warning" : "accent"}>
                              {over ? "Over limit" : near ? "Near limit" : "On track"} · {percent}%
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-muted">{budget.yearMonth}</p>
                          <ProgressBar
                            percent={percent}
                            thresholdPercent={threshold}
                            label={`${budget.categoryName} budget usage`}
                          />
                          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-sm">
                            <span>{displayAmount(budget.spentMinor, budget.currency)}</span>
                            <span className="text-muted">
                              / {displayAmount(budget.limitMinor, budget.currency)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
