"use client";

import { FormEvent, useCallback, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ReceiptText,
  Undo2,
} from "lucide-react";
import {
  Account,
  LedgerEntry,
  createTransaction,
  listAccounts,
  listTransactions,
  reverseTransaction,
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
import { cn } from "@/lib/cn";

type PageData = { accounts: Account[]; entries: LedgerEntry[] };

const entryStyles: Record<string, { icon: typeof ArrowUpRight; className: string }> = {
  INCOME: { icon: ArrowDownLeft, className: "bg-positive/10 text-positive" },
  EXPENSE: { icon: ArrowUpRight, className: "bg-negative/10 text-negative" },
  TRANSFER: { icon: ArrowLeftRight, className: "bg-accent-soft text-accent-strong dark:text-accent" },
  REVERSAL: { icon: Undo2, className: "bg-surface-2 text-muted" },
};

export default function TransactionsPage() {
  const load = useCallback(async (): Promise<PageData> => {
    const [accounts, entries] = await Promise.all([listAccounts(), listTransactions()]);
    return { accounts, entries };
  }, []);
  const { data, loading, error, refresh } = useAsyncData(load);
  const accounts = data?.accounts ?? [];
  const entries = data?.entries ?? [];

  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [entryType, setEntryType] = useState("EXPENSE");
  const [amountMinor, setAmountMinor] = useState("10000");
  const [memo, setMemo] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const selectedAccountId = accountId || accounts[0]?.id || "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (entryType === "TRANSFER" && !transferAccountId) {
      setActionError("Choose a target account for the transfer.");
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction(
        {
          accountId: selectedAccountId,
          entryType,
          amountMinor: Number(amountMinor),
          memo: memo || null,
          transferAccountId: entryType === "TRANSFER" ? transferAccountId : null,
        },
        crypto.randomUUID(),
      );
      setMemo("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onReverse(id: string) {
    setActionError(null);
    setReversingId(id);
    try {
      await reverseTransaction(id, crypto.randomUUID());
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reverse failed");
    } finally {
      setReversingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transactions"
        description="Immutable ledger — mistakes are fixed with reversal entries, never edits."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>Post entry</CardTitle>
          <CardDescription>
            Amounts are integer minor units; every write carries an Idempotency-Key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_1fr_auto]"
          >
            <Field label="Account">
              {(id) => (
                <Select
                  id={id}
                  value={selectedAccountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Type">
              {(id) => (
                <Select id={id} value={entryType} onChange={(e) => setEntryType(e.target.value)}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="TRANSFER">Transfer</option>
                </Select>
              )}
            </Field>
            {entryType === "TRANSFER" ? (
              <Field label="Transfer to">
                {(id) => (
                  <Select
                    id={id}
                    value={transferAccountId}
                    onChange={(e) => setTransferAccountId(e.target.value)}
                    required
                  >
                    <option value="">Choose account…</option>
                    {accounts
                      .filter((a) => a.id !== selectedAccountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </Select>
                )}
              </Field>
            ) : null}
            <Field label="Amount (minor units)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={amountMinor}
                  onChange={(e) => setAmountMinor(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Memo">
              {(id) => (
                <Input
                  id={id}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Optional note"
                />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="self-end">
              Post entry
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Ledger is empty"
          description="Post your first entry above, or draft one in natural language on the AI page."
        />
      ) : (
        <Card className="animate-fade-up [animation-delay:120ms]">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {entries.map((entry) => {
                const style = entryStyles[entry.entryType] ?? entryStyles.REVERSAL;
                const Icon = style.icon;
                const signed =
                  entry.entryType === "INCOME"
                    ? `+${formatMinor(entry.amountMinor, entry.currency)}`
                    : entry.entryType === "EXPENSE"
                      ? `-${formatMinor(entry.amountMinor, entry.currency)}`
                      : formatMinor(entry.amountMinor, entry.currency);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2/60"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        style.className,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.memo || entry.entryType}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(entry.occurredAt).toLocaleString()}
                        {entry.reversesEntryId ? " · reversal" : ""}
                      </p>
                    </div>
                    <Badge tone="neutral" className="hidden sm:inline-flex">
                      {entry.entryType}
                    </Badge>
                    <p
                      className={cn(
                        "font-mono text-sm font-medium",
                        entry.entryType === "INCOME" && "text-positive",
                        entry.entryType === "EXPENSE" && "text-negative",
                      )}
                    >
                      {signed}
                    </p>
                    {entry.entryType !== "REVERSAL" && !entry.reversesEntryId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={reversingId === entry.id}
                        onClick={() => void onReverse(entry.id)}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Reverse
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
