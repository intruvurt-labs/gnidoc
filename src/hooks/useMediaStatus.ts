import { useEffect, useRef, useState } from 'react';

export type MediaStatus = 'idle' | 'running' | 'succeeded' | 'failed';

export interface MediaStatusResponse {
  status: MediaStatus;
  mediaUrl?: string;
  error?: string;
}

interface Options {
  pollIntervalMs?: number;
  enabled?: boolean;
}

export function useMediaStatus(jobId: string | null | undefined, opts: Options = {}) {
  const { pollIntervalMs = 2500, enabled = true } = opts;
  const [data, setData] = useState<MediaStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clear();

    if (!jobId || !enabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/media/status?id=${encodeURIComponent(jobId)}`, { method: 'GET' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json: MediaStatusResponse = await res.json();
        if (cancelled) return;
        setData(json);
        setError(null);

        if (json.status === 'running') {
          timerRef.current = setTimeout(poll, pollIntervalMs);
        } else {
          clear();
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error('[useMediaStatus] Poll error', e);
        setError(String(e?.message || e));
        timerRef.current = setTimeout(poll, pollIntervalMs * 2);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clear();
    };
  }, [jobId, enabled, pollIntervalMs]);

  return { data, isLoading, error } as const;
}
