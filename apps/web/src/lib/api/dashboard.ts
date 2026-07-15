import { api } from "./client";
import type { DashboardRow } from "./types";

export function getDashboard() {
  return api<DashboardRow[]>("/api/v1/dashboard");
}
