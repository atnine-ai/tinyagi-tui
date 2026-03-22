import { useEffect, useRef } from 'react';
import type { AppAction } from '../types.js';
import { fetchAgents } from '../lib/api.js';
import { getMockAgents } from '../mock/generator.js';

const POLL_INTERVAL = 10_000;

export function useAgents(dispatch: React.Dispatch<AppAction>, mockMode: boolean): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        if (mockMode) {
          const agents = getMockAgents();
          if (mounted) {
            dispatch({ type: 'SET_AGENTS', agents });
            dispatch({ type: 'SET_CONNECTED', connected: true });
          }
        } else {
          const agents = await fetchAgents();
          if (mounted) {
            dispatch({ type: 'SET_AGENTS', agents });
            dispatch({ type: 'SET_CONNECTED', connected: true });
          }
        }
      } catch {
        if (mounted && !mockMode) {
          // API unreachable — switch to mock mode indicator
          dispatch({ type: 'SET_CONNECTED', connected: false });
        }
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
