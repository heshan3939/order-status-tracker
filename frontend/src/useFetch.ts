import { useState, useEffect, useCallback } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: any[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);

  const retry = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return; // Ignore aborted requests
        }
        if (!controller.signal.aborted) {
          setError(err.message || 'An unexpected error occurred');
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [...deps, count]);

  return { data, loading, error, retry };
}
