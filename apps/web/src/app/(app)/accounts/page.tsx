"use client";

import { FormEvent, useRef, useState } from "react";
import { Banknote, FolderTree, Landmark, Smartphone, Tags, Wallet } from "lucide-react";
import {
  type Account,
  type Category,
  createAccount,
  createCategory,
  listAccounts,
  listCategories,
} from "@/lib/api";
import { formatMinor } from "@/lib/money";
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
  Select,
  SkeletonRows,
} from "@/components/ui";

const typeIcons: Record<string, typeof Wallet> = {
  CASH: Banknote,
  BANK: Landmark,
  E_WALLET: Smartphone,
};

function groupAccountsByCurrency(accounts: Account[]) {
  const groups = new Map<string, Account[]>();

  for (const account of accounts) {
    const group = groups.get(account.currency) ?? [];
    group.push(account);
    groups.set(account.currency, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function loadedLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"} loaded`;
}

export default function AccountsPage() {
  const {
    data: accounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAsyncData(listAccounts);
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
  } = useAsyncData(listCategories);

  const [name, setName] = useState("Cash");
  const [accountType, setAccountType] = useState("CASH");
  const [currency, setCurrency] = useState("VND");
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const accountRequestKey = useRef<string | null>(null);

  const [categoryName, setCategoryName] = useState("Food");
  const [categoryKind, setCategoryKind] = useState<Category["kind"]>("EXPENSE");
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const categoryRequestKey = useRef<string | null>(null);

  const accountGroups = groupAccountsByCurrency(accounts ?? []);

  function changeAccountIntent(update: () => void) {
    accountRequestKey.current = null;
    setAccountFormError(null);
    update();
  }

  function changeCategoryIntent(update: () => void) {
    categoryRequestKey.current = null;
    setCategoryFormError(null);
    update();
  }

  async function onAccountSubmit(event: FormEvent) {
    event.preventDefault();
    setAccountFormError(null);
    setAccountSubmitting(true);

    const idempotencyKey = accountRequestKey.current ?? crypto.randomUUID();
    accountRequestKey.current = idempotencyKey;

    try {
      await createAccount(
        {
          name: name.trim(),
          accountType,
          currency: currency.trim().toUpperCase(),
        },
        idempotencyKey,
      );
      accountRequestKey.current = null;
      await refreshAccounts();
    } catch (err) {
      setAccountFormError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setAccountSubmitting(false);
    }
  }

  async function onCategorySubmit(event: FormEvent) {
    event.preventDefault();
    setCategoryFormError(null);
    setCategorySubmitting(true);

    const idempotencyKey = categoryRequestKey.current ?? crypto.randomUUID();
    categoryRequestKey.current = idempotencyKey;

    try {
      await createCategory(
        { name: categoryName.trim(), kind: categoryKind },
        idempotencyKey,
      );
      categoryRequestKey.current = null;
      await refreshCategories();
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : "Category creation failed");
    } finally {
      setCategorySubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Accounts & categories"
        description="Organize ledger destinations and classification rules without mixing balances across currencies."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <Card className="animate-fade-up [animation-delay:60ms]">
          <CardHeader>
            <CardTitle>New account</CardTitle>
            <CardDescription>Balance starts at zero and only moves through ledger entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onAccountSubmit}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_8rem_auto]"
            >
              <Field label="Name">
                {(id) => (
                  <Input
                    id={id}
                    value={name}
                    onChange={(event) =>
                      changeAccountIntent(() => setName(event.target.value))
                    }
                    placeholder="e.g. Daily cash"
                    disabled={accountSubmitting}
                    required
                  />
                )}
              </Field>
              <Field label="Type">
                {(id) => (
                  <Select
                    id={id}
                    value={accountType}
                    onChange={(event) =>
                      changeAccountIntent(() => setAccountType(event.target.value))
                    }
                    disabled={accountSubmitting}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="E_WALLET">E-wallet</option>
                  </Select>
                )}
              </Field>
              <Field label="Currency" hint="ISO 4217">
                {(id) => (
                  <Input
                    id={id}
                    value={currency}
                    onChange={(event) =>
                      changeAccountIntent(() => setCurrency(event.target.value.toUpperCase()))
                    }
                    minLength={3}
                    maxLength={3}
                    disabled={accountSubmitting}
                    required
                  />
                )}
              </Field>
              <Button type="submit" loading={accountSubmitting} className="self-end">
                Add account
              </Button>
            </form>
            {accountFormError ? (
              <Alert tone="error" className="mt-4">
                {accountFormError}. Retry without changing the form to safely reuse this request.
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-fade-up [animation-delay:100ms]">
          <CardHeader>
            <CardTitle>New category</CardTitle>
            <CardDescription>Categories classify entries; they never change a balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCategorySubmit} className="grid gap-4 sm:grid-cols-[1fr_9rem_auto]">
              <Field label="Name">
                {(id) => (
                  <Input
                    id={id}
                    value={categoryName}
                    onChange={(event) =>
                      changeCategoryIntent(() => setCategoryName(event.target.value))
                    }
                    placeholder="e.g. Groceries"
                    disabled={categorySubmitting}
                    required
                  />
                )}
              </Field>
              <Field label="Kind">
                {(id) => (
                  <Select
                    id={id}
                    value={categoryKind}
                    onChange={(event) =>
                      changeCategoryIntent(() =>
                        setCategoryKind(event.target.value as Category["kind"]),
                      )
                    }
                    disabled={categorySubmitting}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </Select>
                )}
              </Field>
              <Button type="submit" loading={categorySubmitting} className="self-end">
                Add category
              </Button>
            </form>
            {categoryFormError ? (
              <Alert tone="error" className="mt-4">
                {categoryFormError}. Retry without changing the form to safely reuse this request.
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="account-balances-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="account-balances-heading" className="font-display text-2xl font-medium">
              Account balances
            </h2>
            <p className="mt-1 text-sm text-muted">Each currency stays in its own balance group.</p>
          </div>
          {!accountsLoading && !accountsError && accounts ? (
            <Badge tone="neutral">{loadedLabel(accounts.length, "account")}</Badge>
          ) : null}
        </div>

        {accountsLoading ? (
          <SkeletonRows rows={3} />
        ) : accountsError ? (
          <div className="flex flex-col items-start gap-3">
            <Alert tone="error">{accountsError}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void refreshAccounts()}>
              Retry accounts
            </Button>
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts loaded"
            description="Create your first account above before recording ledger entries."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {accountGroups.map(([groupCurrency, currencyAccounts]) => (
              <section key={groupCurrency} aria-labelledby={`currency-${groupCurrency}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 id={`currency-${groupCurrency}`} className="font-mono text-sm font-semibold">
                    {groupCurrency}
                  </h3>
                  <span className="text-xs text-muted">
                    {loadedLabel(currencyAccounts.length, "row")}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currencyAccounts.map((account, index) => {
                    const Icon = typeIcons[account.accountType] ?? Wallet;
                    return (
                      <Card
                        key={account.id}
                        hover
                        className="animate-fade-up"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <CardContent className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
                              <Icon className="h-4 w-4 text-accent-strong dark:text-accent" aria-hidden />
                            </div>
                            <Badge tone="neutral">{account.accountType.replace("_", " ")}</Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{account.name}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-muted">
                              {account.id.slice(0, 8)}
                            </p>
                          </div>
                          <p className="font-mono text-lg font-semibold tracking-tight">
                            {formatMinor(account.balanceMinor, account.currency)}
                          </p>
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

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="categories-heading" className="font-display text-2xl font-medium">
              Categories
            </h2>
            <p className="mt-1 text-sm text-muted">Income and expense labels supplied by the ledger service.</p>
          </div>
          {!categoriesLoading && !categoriesError && categories ? (
            <Badge tone="neutral">{loadedLabel(categories.length, "category")}</Badge>
          ) : null}
        </div>

        {categoriesLoading ? (
          <SkeletonRows rows={2} />
        ) : categoriesError ? (
          <div className="flex flex-col items-start gap-3">
            <Alert tone="error">{categoriesError}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void refreshCategories()}>
              Retry categories
            </Button>
          </div>
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories loaded"
            description="Create an income or expense category above to classify future entries."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Card
                key={category.id}
                hover
                className="animate-fade-up"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                    <Tags className="h-4 w-4 text-muted" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{category.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {category.id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge tone={category.kind === "INCOME" ? "accent" : "neutral"}>
                    {category.kind.toLowerCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
