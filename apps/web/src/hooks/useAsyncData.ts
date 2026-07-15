"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureDevSession } from "@/lib/api";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetch-on-mount helper for client pages: bootstraps the dev session,
 * runs the loader, and exposes a `refresh` for after mutations.
 */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      await ensureDevSession();
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load",
      }));
    }
  }, [loader]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
