"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetch-on-mount helper that ignores stale responses and exposes a `refresh`
 * for after mutations.
 */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const requestId = useRef(0);
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await loader();
      if (currentRequest === requestId.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    }
  }, [loader]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return { ...state, refresh };
}
