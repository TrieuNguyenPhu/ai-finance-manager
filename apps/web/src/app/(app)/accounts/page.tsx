"use client";

import { FormEvent, useState } from "react";
import { Banknote, Landmark, Smartphone, Wallet } from "lucide-react";
import { createAccount, listAccounts } from "@/lib/api";
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

export default function AccountsPage() {
  const { data: accounts, loading, error, refresh } = useAsyncData(listAccounts);
  const [name, setName] = useState("Cash");
  const [accountType, setAccountType] = useState("CASH");
  const [currency, setCurrency] = useState("VND");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createAccount({ name, accountType, currency });
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
        title="Accounts"
        description="Cash, bank, and e-wallet balances tracked in integer minor units."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>New account</CardTitle>
          <CardDescription>Balance starts at zero; it only moves via ledger entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem_auto]">
            <Field label="Name">
              {(id) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily cash"
                  required
                />
              )}
            </Field>
            <Field label="Type">
              {(id) => (
                <Select id={id} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="E_WALLET">E-wallet</option>
                </Select>
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
              Add account
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Create your first account above — transactions and AI drafts need one to post into."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a, i) => {
            const Icon = typeIcons[a.accountType] ?? Wallet;
            return (
              <Card
                key={a.id}
                hover
                className="animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
                      <Icon className="h-4 w-4 text-accent-strong dark:text-accent" />
                    </div>
                    <Badge tone="neutral">{a.accountType}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">{a.id.slice(0, 8)}</p>
                  </div>
                  <p className="font-mono text-lg font-semibold tracking-tight">
                    {formatMinor(a.balanceMinor, a.currency)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
