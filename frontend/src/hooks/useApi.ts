import { useState, useCallback } from 'react';
import { getApiError } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
): UseApiState<T> & { execute: (...args: Args) => Promise<T | null> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await fn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const message = getApiError(err);
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  return { ...state, execute };
}
