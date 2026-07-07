import { api } from "./client";
import type { Account } from "./types";

export function listAccounts() {
  return api<Account[]>("/api/v1/accounts");
}

export function createAccount(body: {
  name: string;
  accountType: string;
  currency: string;
}) {
  return api<Account>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
