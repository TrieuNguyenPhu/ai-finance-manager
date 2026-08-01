"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/cn";

type HealthState = "checking" | "online" | "offline";

/** Non-blocking gateway liveness signal. It does not imply upstream readiness. */
export function GatewayStatus() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE}/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(2_000),
        });
        if (active) setState(response.ok ? "online" : "offline");
      } catch {
        if (active) setState("offline");
      }
    }

    void checkHealth();
    return () => {
      active = false;
    };
  }, []);

  const label =
    state === "checking"
      ? "Checking gateway"
      : state === "online"
        ? "Gateway online"
        : "Gateway offline";

  return (
    <span aria-live="polite" className="inline-flex items-center gap-2 text-xs text-muted">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "online" ? "bg-positive" : state === "offline" ? "bg-negative" : "bg-muted",
        )}
      />
      {label}
    </span>
  );
}
