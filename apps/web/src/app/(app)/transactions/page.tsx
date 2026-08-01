"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ReceiptText,
  Undo2,
} from "lucide-react";
import {
  type Account,
  type Category,
  type LedgerEntry,
  createTransaction,
  listAccounts,
  listCategories,
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

type EntryType = "INCOME" | "EXPENSE" | "TRANSFER";
type PageData = { accounts: Account[]; categories: Category[]; entries: LedgerEntry[] };
type TransactionDraft = {
  accountId: string;
  categoryId: string | null;
  entryType: EntryType;
  amountMinor: number;
  memo: string | null;
  transferAccountId: string | null;
};
type PendingTransaction = {
  draft: TransactionDraft;
  accountName: string;
  categoryName: string | null;
  transferAccountName: string | null;
  currency: string;
};

const entryStyles: Record<string, { icon: typeof ArrowUpRight; className: string }> = {
  INCOME: { icon: ArrowDownLeft, className: "bg-positive/10 text-positive" },
  EXPENSE: { icon: ArrowUpRight, className: "bg-negative/10 text-negative" },
  TRANSFER: { icon: ArrowLeftRight, className: "bg-accent-soft text-accent-strong dark:text-accent" },
  REVERSAL: { icon: Undo2, className: "bg-surface-2 text-muted" },
};

function displayAmount(amountMinor: number, currency: string) {
  try {
    return formatMinor(amountMinor, currency);
  } catch {
    return `${amountMinor} ${currency}`;
  }
}

function ReviewDialog({
  title,
  description,
  children,
  confirmLabel,
  confirming,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  children: ReactNode;
  confirmLabel: string;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-2xl outline-none sm:p-6"
      >
        <h2 id="review-dialog-title" className="font-display text-2xl font-medium">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-5 rounded-lg border border-border bg-surface-2/50 p-4 text-sm">
          {children}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button loading={confirming} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const load = useCallback(async (): Promise<PageData> => {
    const [accounts, categories, entries] = await Promise.all([
      listAccounts(),
      listCategories(),
      listTransactions(),
    ]);
    return { accounts, categories, entries };
  }, []);
  const { data, loading, error, refresh } = useAsyncData(load);
  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];
  const entries = data?.entries ?? [];

  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("EXPENSE");
  const [amountMinor, setAmountMinor] = useState("10000");
  const [memo, setMemo] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [pendingReversal, setPendingReversal] = useState<LedgerEntry | null>(null);
  const transactionRequestKey = useRef<string | null>(null);
  const reversalRequestKeys = useRef(new Map<string, string>());

  const selectedAccountId = accountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const compatibleTransferAccounts = accounts.filter(
    (account) => account.id !== selectedAccountId && account.currency === selectedAccount?.currency,
  );
  const selectedTransferAccountId = compatibleTransferAccounts.some(
    (account) => account.id === transferAccountId,
  )
    ? transferAccountId
    : "";
  const allowedCategories = categories.filter((category) => category.kind === entryType);
  const selectedCategoryId = allowedCategories.some((category) => category.id === categoryId)
    ? categoryId
    : allowedCategories[0]?.id || "";
  const selectedCategory = allowedCategories.find((category) => category.id === selectedCategoryId);

  function changeTransactionIntent(update: () => void) {
    transactionRequestKey.current = null;
    setActionError(null);
    update();
  }

  function validateDraft(): TransactionDraft | null {
    const parsedAmount = Number(amountMinor);
    if (!selectedAccount) {
      setActionError("Choose an account before reviewing the entry.");
      return null;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setActionError("Amount must be a positive integer in minor units.");
      return null;
    }
    if (entryType !== "TRANSFER" && !selectedCategory) {
      setActionError(`Choose an ${entryType.toLowerCase()} category before reviewing the entry.`);
      return null;
    }
    if (entryType === "TRANSFER" && !selectedTransferAccountId) {
      setActionError("Choose a target account with the same currency for the transfer.");
      return null;
    }
    return {
      accountId: selectedAccount.id,
      categoryId: entryType === "TRANSFER" ? null : selectedCategory?.id ?? null,
      entryType,
      amountMinor: parsedAmount,
      memo: memo.trim() || null,
      transferAccountId: entryType === "TRANSFER" ? selectedTransferAccountId : null,
    };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const draft = validateDraft();
    if (!draft || !selectedAccount) return;
    const transferAccount = accounts.find((account) => account.id === draft.transferAccountId);
    setPendingTransaction({
      draft,
      accountName: selectedAccount.name,
      categoryName: selectedCategory?.name ?? null,
      transferAccountName: transferAccount?.name ?? null,
      currency: selectedAccount.currency,
    });
  }

  async function confirmTransaction() {
    if (!pendingTransaction) return;
    setActionError(null);
    setSubmitting(true);
    const idempotencyKey = transactionRequestKey.current ?? crypto.randomUUID();
    transactionRequestKey.current = idempotencyKey;
    try {
      await createTransaction(pendingTransaction.draft, idempotencyKey);
      transactionRequestKey.current = null;
      setPendingTransaction(null);
      setMemo("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  function onReverse(entry: LedgerEntry) {
    setActionError(null);
    setPendingReversal(entry);
  }

  async function confirmReversal() {
    if (!pendingReversal) return;
    setActionError(null);
    setReversingId(pendingReversal.id);
    const idempotencyKey = reversalRequestKeys.current.get(pendingReversal.id) ?? crypto.randomUUID();
    reversalRequestKeys.current.set(pendingReversal.id, idempotencyKey);
    try {
      await reverseTransaction(pendingReversal.id, idempotencyKey);
      reversalRequestKeys.current.delete(pendingReversal.id);
      setPendingReversal(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reverse failed");
    } finally {
      setReversingId(null);
    }
  }

  const reviewOpen = pendingTransaction !== null || pendingReversal !== null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Transactions"
        description="Review every immutable ledger write before recording it; mistakes are fixed with linked reversals."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>Draft entry</CardTitle>
          <CardDescription>
            Nothing is posted until you review and confirm. Amounts stay integer minor units.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && data && accounts.length === 0 ? (
            <Alert tone="info" className="mb-4">
              Create an account before drafting a ledger entry.
            </Alert>
          ) : null}
          {!loading && data && entryType !== "TRANSFER" && allowedCategories.length === 0 ? (
            <Alert tone="info" className="mb-4">
              Create a matching {entryType.toLowerCase()} category before drafting this entry.
            </Alert>
          ) : null}
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_1fr_auto]"
          >
            <Field label="Account">
              {(id) => (
                <Select
                  id={id}
                  value={selectedAccountId}
                  onChange={(event) =>
                    changeTransactionIntent(() => setAccountId(event.target.value))
                  }
                  disabled={loading || !accounts.length || reviewOpen}
                  required
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.currency}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Type">
              {(id) => (
                <Select
                  id={id}
                  value={entryType}
                  onChange={(event) =>
                    changeTransactionIntent(() => setEntryType(event.target.value as EntryType))
                  }
                  disabled={loading || reviewOpen}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="TRANSFER">Transfer</option>
                </Select>
              )}
            </Field>
            {entryType === "TRANSFER" ? (
              <Field label="Transfer to" hint="Same currency only">
                {(id) => (
                  <Select
                    id={id}
                    value={selectedTransferAccountId}
                    onChange={(event) =>
                      changeTransactionIntent(() => setTransferAccountId(event.target.value))
                    }
                    disabled={loading || !compatibleTransferAccounts.length || reviewOpen}
                    required
                  >
                    <option value="">Choose account...</option>
                    {compatibleTransferAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <Field label="Category" hint={`${entryType.toLowerCase()} categories only`}>
                {(id) => (
                  <Select
                    id={id}
                    value={selectedCategoryId}
                    onChange={(event) =>
                      changeTransactionIntent(() => setCategoryId(event.target.value))
                    }
                    disabled={loading || !allowedCategories.length || reviewOpen}
                    required
                  >
                    {allowedCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <Field label="Amount (minor units)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={amountMinor}
                  onChange={(event) =>
                    changeTransactionIntent(() => setAmountMinor(event.target.value))
                  }
                  disabled={loading || reviewOpen}
                  required
                />
              )}
            </Field>
            <Field label="Memo">
              {(id) => (
                <Input
                  id={id}
                  value={memo}
                  onChange={(event) => changeTransactionIntent(() => setMemo(event.target.value))}
                  placeholder="Optional note"
                  disabled={loading || reviewOpen}
                />
              )}
            </Field>
            <Button
              type="submit"
              loading={submitting}
              disabled={loading || !selectedAccount || reviewOpen}
              className="self-end"
            >
              Review entry
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry ledger data
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Ledger is empty"
          description="Draft your first entry above, or create one from a reviewed AI draft."
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
                    ? `+${displayAmount(entry.amountMinor, entry.currency)}`
                    : entry.entryType === "EXPENSE"
                      ? `-${displayAmount(entry.amountMinor, entry.currency)}`
                      : displayAmount(entry.amountMinor, entry.currency);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        style.className,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.memo || entry.entryType}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(entry.occurredAt).toLocaleString()}
                        {entry.reversesEntryId ? " · linked reversal" : ""}
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
                        disabled={reviewOpen}
                        onClick={() => onReverse(entry)}
                      >
                        <Undo2 className="h-3.5 w-3.5" aria-hidden />
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

      {pendingTransaction ? (
        <ReviewDialog
          title="Review ledger entry"
          description="Confirm the exact entry before it is posted to the immutable ledger. Press Escape to cancel."
          confirmLabel="Confirm and post"
          confirming={submitting}
          onCancel={() => setPendingTransaction(null)}
          onConfirm={() => void confirmTransaction()}
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewValue label="Type" value={pendingTransaction.draft.entryType} />
            <ReviewValue label="Amount" value={displayAmount(pendingTransaction.draft.amountMinor, pendingTransaction.currency)} />
            <ReviewValue label="Account" value={pendingTransaction.accountName} />
            {pendingTransaction.categoryName ? (
              <ReviewValue label="Category" value={pendingTransaction.categoryName} />
            ) : null}
            {pendingTransaction.transferAccountName ? (
              <ReviewValue label="Transfer to" value={pendingTransaction.transferAccountName} />
            ) : null}
            <ReviewValue label="Memo" value={pendingTransaction.draft.memo || "No memo"} />
          </dl>
          {actionError ? <Alert tone="error" className="mt-4">{actionError}</Alert> : null}
        </ReviewDialog>
      ) : null}

      {pendingReversal ? (
        <ReviewDialog
          title="Review reversal"
          description="This creates a linked compensating entry; the original ledger entry will remain unchanged. Press Escape to cancel."
          confirmLabel="Confirm reversal"
          confirming={reversingId === pendingReversal.id}
          onCancel={() => setPendingReversal(null)}
          onConfirm={() => void confirmReversal()}
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReviewValue label="Original entry" value={pendingReversal.id.slice(0, 8)} />
            <ReviewValue
              label="Amount"
              value={displayAmount(pendingReversal.amountMinor, pendingReversal.currency)}
            />
            <ReviewValue label="Type" value={pendingReversal.entryType} />
            <ReviewValue label="Memo" value={pendingReversal.memo || "No memo"} />
          </dl>
          {actionError ? <Alert tone="error" className="mt-4">{actionError}</Alert> : null}
        </ReviewDialog>
      ) : null}
    </div>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
