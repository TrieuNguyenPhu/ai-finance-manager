export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "afm_access_token";
const USER_KEY = "afm_user_id";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function ensureDevSession(userId = "local-dev-user"): Promise<string> {
  const existing = getToken();
  if (existing) return existing;
  const res = await fetch(`${API_BASE}/api/v1/auth/dev-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    throw new Error(`Dev token failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { accessToken: string; userId: string };
  window.localStorage.setItem(TOKEN_KEY, data.accessToken);
  window.localStorage.setItem(USER_KEY, data.userId);
  return data.accessToken;
}

export async function api<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
  retryOnAuthFailure = true,
): Promise<T> {
  const token = await ensureDevSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.idempotencyKey) {
    headers.set("Idempotency-Key", init.idempotencyKey);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retryOnAuthFailure) {
    // Token expired or invalidated: drop the session and retry once.
    clearSession();
    return api<T>(path, init, false);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
