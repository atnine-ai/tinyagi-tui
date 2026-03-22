import { useEffect, useRef } from 'react';
import type { AppAction } from '../types.js';
import { fetchQueueStatus } from '../lib/api.js';

const POLL_INTERVAL = 5_000;

export function useQueueStatus(dispatch: React.Dispatch<AppAction>, mockMode: boolean): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mockMode) return;

    let mounted = true;

    async function poll() {
      try {
        const statuses = await fetchQueueStatus();
        if (!mounted) return;

        for (const qs of statuses) {
          const status = qs.processing ? 'active' : 'idle';
          dispatch({
            type: 'UPDATE_AGENT',
            agentId: qs.agentId,
            updates: { status, lastHeartbeat: Date.now() },
          });
        }
      } catch {
        // Queue API is optional
      }
    }

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dispatch, mockMode]);
}
