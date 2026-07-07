import { api } from "./client";
import type { Draft } from "./types";

export function createDraft(text: string, defaultCurrency = "VND") {
  return api<Draft>("/api/v1/ai/drafts", {
    method: "POST",
    body: JSON.stringify({ text, defaultCurrency }),
  });
}
