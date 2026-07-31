export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "afm_access_token";
const USER_KEY = "afm_user_id";
let pendingDevSession: Promise<string> | null = null;

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function ensureDevSession(userId = "local-dev-user"): Promise<string> {
  if (!isLoopbackDevSession()) {
    throw new ApiError(
      "Production sign-in is not configured yet. Development tokens are restricted to this device.",
      503,
      "AUTH_NOT_CONFIGURED",
    );
  }
  const existing = getToken();
  if (existing) return existing;
  pendingDevSession ??= requestDevSession(userId);
  try {
    return await pendingDevSession;
  } finally {
    pendingDevSession = null;
  }
}

async function requestDevSession(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/dev-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    throw new ApiError(
      "Local sign-in is unavailable. Check that development authentication is enabled.",
      res.status,
      "DEV_SESSION_UNAVAILABLE",
    );
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(
      "Local sign-in returned an invalid session.",
      502,
      "INVALID_DEV_SESSION",
    );
  }
  if (
    !isRecord(data) ||
    typeof data.accessToken !== "string" ||
    data.accessToken.length === 0 ||
    data.accessToken.length > 8192 ||
    data.userId !== userId
  ) {
    throw new ApiError(
      "Local sign-in returned an invalid session.",
      502,
      "INVALID_DEV_SESSION",
    );
  }
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
    throw await toApiError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function isLoopbackDevSession(): boolean {
  if (typeof window === "undefined" || !isLoopbackHost(window.location.hostname)) {
    return false;
  }
  try {
    const apiUrl = new URL(API_BASE, window.location.origin);
    return isLoopbackHost(apiUrl.hostname);
  } catch {
    return false;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallback = defaultErrorMessage(response.status);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new ApiError(fallback, response.status, `HTTP_${response.status}`);
  }

  try {
    const payload = (await response.json()) as ErrorPayload;
    const detail = isRecord(payload.detail) ? payload.detail : payload;
    const code =
      typeof detail.code === "string" && detail.code.length <= 80
        ? detail.code
        : `HTTP_${response.status}`;
    const message =
      typeof detail.message === "string" && detail.message.length <= 240
        ? detail.message
        : fallback;
    return new ApiError(message, response.status, code);
  } catch {
    return new ApiError(fallback, response.status, `HTTP_${response.status}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultErrorMessage(status: number): string {
  if (status === 400) return "The request could not be understood.";
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested record was not found.";
  if (status === 409) return "That change conflicts with the current record.";
  if (status === 422) return "Check the entered values and try again.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  if (status >= 500) return "The service is temporarily unavailable. Try again shortly.";
  return "The request could not be completed.";
}
