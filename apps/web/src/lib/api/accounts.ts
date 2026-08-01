import { api } from "./client";
import type { Account } from "./types";

export function listAccounts() {
  return api<Account[]>("/api/v1/accounts?limit=100");
}

export function createAccount(body: {
  name: string;
  accountType: string;
  currency: string;
}, idempotencyKey = crypto.randomUUID()) {
  return api<Account>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}
