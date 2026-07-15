"use client";

import { FormEvent, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { createDraft, createTransaction, listAccounts, Draft } from "@/lib/api";
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
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";

export default function AiPage() {
  const { data: accounts, error: loadError } = useAsyncData(listAccounts);
  const [text, setText] = useState("coffee 45k");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedAccountId = accountId || accounts?.[0]?.id || "";

  async function onDraft(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDrafting(true);
    try {
      setDraft(await createDraft(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function onConfirm() {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      await createTransaction(
        {
          accountId: selectedAccountId,
          entryType: draft.entryType,
          amountMinor: draft.amountMinor,
          memo: draft.memo,
        },
        crypto.randomUUID(),
      );
      setMessage("Saved to ledger.");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setDraft(null);
    setMessage("Draft discarded — ledger unchanged.");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI draft"
        description="Describe a transaction in plain language. Nothing touches the ledger until you confirm."
      />

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card className="animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>Describe it</CardTitle>
          <CardDescription>e.g. “coffee 45k”, “salary 20 million”, “taxi 120000 VND”.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onDraft} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Transaction description"
              required
              className="flex-1"
            />
            <Button type="submit" loading={drafting}>
              <Sparkles className="h-4 w-4" />
              Draft
            </Button>
          </form>
        </CardContent>
      </Card>

      {draft ? (
        <Card className="animate-scale-in border-accent/40 shadow-[0_8px_30px_rgb(13_148_136/0.12)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Draft preview</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">confidence {(draft.confidence * 100).toFixed(0)}%</Badge>
                <Badge tone="neutral">{draft.provenance}</Badge>
                {draft.categoryHint ? <Badge tone="neutral">{draft.categoryHint}</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="font-mono text-2xl font-semibold tracking-tight">
                {formatMinor(draft.amountMinor, draft.currency)}
              </p>
              <Badge tone={draft.entryType === "INCOME" ? "positive" : "negative"}>
                {draft.entryType}
              </Badge>
              {draft.memo ? <p className="text-sm text-muted">{draft.memo}</p> : null}
            </div>

            <p className="text-xs text-muted">{draft.disclaimer}</p>

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <Field label="Save into account" className="min-w-48">
                {(id) => (
                  <Select
                    id={id}
                    value={selectedAccountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {(accounts ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                onClick={() => void onConfirm()}
                loading={saving}
                disabled={!selectedAccountId || draft.amountMinor <= 0}
              >
                <Check className="h-4 w-4" />
                Confirm & save
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                <X className="h-4 w-4" />
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
