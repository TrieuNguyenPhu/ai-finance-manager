import { api } from "./client";
import type { Budget } from "./types";

export function listBudgets() {
  return api<Budget[]>("/api/v1/budgets");
}

export function createBudget(body: {
  categoryName: string;
  yearMonth: string;
  limitMinor: number;
  currency: string;
  thresholdPercent?: number;
}) {
  return api<Budget>("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
