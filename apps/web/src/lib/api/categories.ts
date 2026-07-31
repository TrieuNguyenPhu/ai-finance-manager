import { api } from "./client";
import type { Category } from "./types";

export function listCategories() {
  return api<Category[]>("/api/v1/categories?limit=100");
}

export function createCategory(body: {
  name: string;
  kind: Category["kind"];
}, idempotencyKey = crypto.randomUUID()) {
  return api<Category>("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}
