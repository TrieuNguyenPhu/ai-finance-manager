import { api } from "./client";
import type { Budget } from "./types";

export function listBudgets() {
  return api<Budget[]>("/api/v1/budgets");
}

export function createBudget(body: {
  categoryId?: string;
  categoryName: string;
  yearMonth: string;
  limitMinor: number;
  currency: string;
  thresholdPercent?: number;
}, idempotencyKey = crypto.randomUUID()) {
  return api<Budget>("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}
