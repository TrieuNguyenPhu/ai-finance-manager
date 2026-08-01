import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, ensureDevSession } from "./client";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function stubWindow(
  hostname: string,
  storage = memoryStorage(),
): ReturnType<typeof memoryStorage> {
  vi.stubGlobal("window", {
    location: { hostname, origin: `http://${hostname}:3000` },
    localStorage: storage,
  });
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("development sessions", () => {
  it("fails closed outside a loopback browser origin", async () => {
    stubWindow("finance.example");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(ensureDevSession()).rejects.toMatchObject({
      code: "AUTH_NOT_CONFIGURED",
      status: 503,
    } satisfies Partial<ApiError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one in-flight token request between concurrent loaders", async () => {
    stubWindow("localhost");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        accessToken: "development-token",
        userId: "local-dev-user",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      Promise.all([ensureDevSession(), ensureDevSession()]),
    ).resolves.toEqual(["development-token", "development-token"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed token responses into a bounded API error", async () => {
    const storage = stubWindow("[::1]");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    await expect(ensureDevSession()).rejects.toMatchObject({
      code: "INVALID_DEV_SESSION",
      status: 502,
    } satisfies Partial<ApiError>);
    expect(storage.getItem("afm_access_token")).toBeNull();
  });
});

describe("API idempotency", () => {
  it("preserves the caller key across the single authentication retry", async () => {
    stubWindow("127.0.0.1", memoryStorage({ afm_access_token: "expired-token" }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          accessToken: "refreshed-token",
          userId: "local-dev-user",
        }),
      )
      .mockResolvedValueOnce(Response.json({ id: "account-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api<{ id: string }>("/api/v1/accounts", {
        method: "POST",
        body: JSON.stringify({ name: "Cash" }),
        idempotencyKey: "stable-request-key",
      }),
    ).resolves.toEqual({ id: "account-1" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const callIndex of [0, 2]) {
      const headers = (fetchMock.mock.calls[callIndex][1] as RequestInit).headers as Headers;
      expect(headers.get("Idempotency-Key")).toBe("stable-request-key");
    }
  });
});
