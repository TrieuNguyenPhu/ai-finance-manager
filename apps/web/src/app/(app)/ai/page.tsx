"use client";

import { FormEvent, useCallback, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import {
  type Account,
  type Category,
  type Draft,
  createDraft,
  createTransaction,
  getProfile,
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

type DraftEntryType = "INCOME" | "EXPENSE" | "TRANSFER";
type PageData = { accounts: Account[]; categories: Category[]; preferredCurrency: string };

function normalizeEntryType(value: string): DraftEntryType {
  if (value === "INCOME" || value === "TRANSFER") return value;
  return "EXPENSE";
}

function displayAmount(amountMinor: number, currency: string) {
  try {
    return formatMinor(amountMinor, currency);
  } catch {
    return `${amountMinor} ${currency}`;
  }
}

function categoryMatchesHint(category: Category, hint: string | null) {
  if (!hint) return false;
  return category.name.trim().toLowerCase() === hint.trim().toLowerCase();
}

export default function AiPage() {
  const load = useCallback(async (): Promise<PageData> => {
    const [accounts, categories, profile] = await Promise.all([
      listAccounts(),
      listCategories(),
      getProfile(),
    ]);
    return {
      accounts,
      categories,
      preferredCurrency: profile.preferredCurrency,
    };
  }, []);
  const { data, loading, error: loadError, refresh } = useAsyncData(load);
  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];
  const preferredCurrency = data?.preferredCurrency ?? "VND";

  const [text, setText] = useState("coffee 45k");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSourceText, setDraftSourceText] = useState<string | null>(null);
  const [draftAmountMinor, setDraftAmountMinor] = useState("");
  const [draftCurrency, setDraftCurrency] = useState("");
  const [draftEntryType, setDraftEntryType] = useState<DraftEntryType>("EXPENSE");
  const [draftMemo, setDraftMemo] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transactionRequestKey, setTransactionRequestKey] = useState<string | null>(null);

  const normalizedDraftCurrency = draftCurrency.trim().toUpperCase();
  const matchingAccounts = accounts.filter(
    (account) => account.currency === normalizedDraftCurrency,
  );
  const selectedAccountId = matchingAccounts.some((account) => account.id === accountId)
    ? accountId
    : matchingAccounts[0]?.id || "";
  const selectedAccount = matchingAccounts.find((account) => account.id === selectedAccountId);
  const matchingCategories = categories.filter((category) => category.kind === draftEntryType);
  const hintedCategory = matchingCategories.find((category) =>
    categoryMatchesHint(category, draft?.categoryHint ?? null),
  );
  const selectedCategoryId = matchingCategories.some((category) => category.id === categoryId)
    ? categoryId
    : hintedCategory?.id || matchingCategories[0]?.id || "";
  const selectedCategory = matchingCategories.find((category) => category.id === selectedCategoryId);
  const isDraftStale = draft !== null && draftSourceText !== text;
  const hasAccountsForCurrency = matchingAccounts.length > 0;
  const hasCategoryForDraft = draftEntryType === "TRANSFER" || matchingCategories.length > 0;

  async function onDraft(event: FormEvent) {
    event.preventDefault();
    const sourceText = text.trim();
    if (!sourceText) return;

    setError(null);
    setMessage(null);
    setDraft(null);
    setDraftSourceText(null);
    setTransactionRequestKey(null);
    setDrafting(true);
    try {
      const nextDraft = await createDraft(sourceText, preferredCurrency);
      setDraft(nextDraft);
      setDraftSourceText(sourceText);
      setDraftAmountMinor(String(nextDraft.amountMinor));
      setDraftCurrency(nextDraft.currency.toUpperCase());
      setDraftEntryType(normalizeEntryType(nextDraft.entryType));
      setDraftMemo(nextDraft.memo ?? "");
      setAccountId("");
      setCategoryId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function onConfirm() {
    if (!draft) return;
    setError(null);
    if (isDraftStale) {
      setError("Draft the current source text again before confirming.");
      return;
    }
    const parsedAmountMinor = Number(draftAmountMinor);
    if (!Number.isSafeInteger(parsedAmountMinor) || parsedAmountMinor <= 0) {
      setError("Amount must be a positive integer in minor units.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(normalizedDraftCurrency)) {
      setError("Use a valid three-letter currency code.");
      return;
    }
    if (!selectedAccount) {
      setError(`No account is available in ${normalizedDraftCurrency}. Create or select a matching account.`);
      return;
    }
    if (!hasCategoryForDraft || (draftEntryType !== "TRANSFER" && !selectedCategory)) {
      setError(`Create or choose a matching ${draftEntryType.toLowerCase()} category first.`);
      return;
    }

    setSaving(true);
    const idempotencyKey = transactionRequestKey ?? crypto.randomUUID();
    setTransactionRequestKey(idempotencyKey);
    try {
      await createTransaction(
        {
          accountId: selectedAccount.id,
          categoryId: draftEntryType === "TRANSFER" ? null : selectedCategory?.id ?? null,
          entryType: draftEntryType,
          amountMinor: parsedAmountMinor,
          memo: draftMemo.trim() || null,
        },
        idempotencyKey,
      );
      setTransactionRequestKey(null);
      setMessage("Saved to ledger after explicit confirmation.");
      setDraft(null);
      setDraftSourceText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setDraft(null);
    setDraftSourceText(null);
    setTransactionRequestKey(null);
    setMessage("Draft discarded - ledger unchanged.");
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="AI draft"
        description="Describe a transaction in plain language. AI proposes a draft; only your explicit confirmation can write the ledger."
      />

      {loadError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry AI context
          </Button>
        </div>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>Describe it</CardTitle>
          <CardDescription>
            e.g. &quot;coffee 45k&quot;, &quot;salary 20 million&quot;, or &quot;taxi 120000 VND&quot;. Drafts use your preferred currency ({preferredCurrency}) by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onDraft} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Transaction description"
              required
              className="flex-1"
              disabled={drafting}
            />
            <Button type="submit" loading={drafting}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Draft
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? <SkeletonRows rows={3} /> : null}

      {draft ? (
        <Card className="animate-scale-in border-accent/40 shadow-[0_8px_30px_rgb(13_148_136/0.12)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Draft review</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">confidence {(draft.confidence * 100).toFixed(0)}%</Badge>
                <Badge tone="neutral">{draft.provenance}</Badge>
                {draft.categoryHint ? <Badge tone="neutral">hint: {draft.categoryHint}</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isDraftStale ? (
              <Alert tone="warning">
                Source text changed after this draft was generated. Run Draft again before confirming.
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Amount (minor units)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={draftAmountMinor}
                    onChange={(event) => setDraftAmountMinor(event.target.value)}
                    disabled={saving || isDraftStale}
                    required
                  />
                )}
              </Field>
              <Field label="Currency" hint="ISO 4217">
                {(id) => (
                  <Input
                    id={id}
                    value={draftCurrency}
                    onChange={(event) => setDraftCurrency(event.target.value.toUpperCase())}
                    minLength={3}
                    maxLength={3}
                    disabled={saving || isDraftStale}
                    required
                  />
                )}
              </Field>
              <Field label="Entry type">
                {(id) => (
                  <Select
                    id={id}
                    value={draftEntryType}
                    onChange={(event) => setDraftEntryType(event.target.value as DraftEntryType)}
                    disabled={saving || isDraftStale}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="TRANSFER">Transfer</option>
                  </Select>
                )}
              </Field>
              <Field label="Memo">
                {(id) => (
                  <Input
                    id={id}
                    value={draftMemo}
                    onChange={(event) => setDraftMemo(event.target.value)}
                    placeholder="Optional note"
                    disabled={saving || isDraftStale}
                  />
                )}
              </Field>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
              <Field label="Save into account" hint={`Only ${normalizedDraftCurrency} accounts are eligible`} className="min-w-48 flex-1">
                {(id) => (
                  <Select
                    id={id}
                    value={selectedAccountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    disabled={saving || isDraftStale || !hasAccountsForCurrency}
                  >
                    {matchingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currency}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {draftEntryType !== "TRANSFER" ? (
                <Field label="Category" hint="Matching entry type">
                  {(id) => (
                    <Select
                      id={id}
                      value={selectedCategoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      disabled={saving || isDraftStale || !matchingCategories.length}
                    >
                      {matchingCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:pb-0.5">
                <Button
                  onClick={() => void onConfirm()}
                  loading={saving}
                  disabled={
                    isDraftStale ||
                    !selectedAccountId ||
                    !hasAccountsForCurrency ||
                    !hasCategoryForDraft
                  }
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Confirm & save
                </Button>
                <Button variant="ghost" onClick={onCancel} disabled={saving}>
                  <X className="h-4 w-4" aria-hidden />
                  Discard
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 border-t border-border pt-4">
              <p className="font-mono text-2xl font-semibold tracking-tight">
                {displayAmount(Number(draftAmountMinor) || 0, normalizedDraftCurrency)}
              </p>
              <Badge tone={draftEntryType === "INCOME" ? "positive" : "negative"}>
                {draftEntryType}
              </Badge>
              <p className="text-xs text-muted">{draft.disclaimer}</p>
            </div>
          </CardContent>
        </Card>
      ) : !loading && !loadError && !accounts.length ? (
        <EmptyState
          icon={Sparkles}
          title="Create an account first"
          description="AI can draft a transaction, but a matching account is required before confirmation."
        />
      ) : null}
    </div>
  );
}
