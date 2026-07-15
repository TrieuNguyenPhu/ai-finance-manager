import { api } from "./client";
import type { LedgerEntry } from "./types";

export function listTransactions() {
  return api<LedgerEntry[]>("/api/v1/transactions");
}

export function createTransaction(
  body: {
    accountId: string;
    categoryId?: string | null;
    entryType: string;
    amountMinor: number;
    memo?: string | null;
    transferAccountId?: string | null;
  },
  idempotencyKey: string,
) {
  return api<LedgerEntry>("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}

export function reverseTransaction(id: string, idempotencyKey: string) {
  return api<LedgerEntry>(`/api/v1/transactions/${id}/reversals`, {
    method: "POST",
    idempotencyKey,
  });
}
