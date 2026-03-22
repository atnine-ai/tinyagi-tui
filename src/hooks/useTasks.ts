import { useEffect, useRef } from 'react';
import type { AppAction } from '../types.js';
import { fetchTasks } from '../lib/api.js';
import { getMockTasks } from '../mock/generator.js';

const POLL_INTERVAL = 30_000;

export function useTasks(dispatch: React.Dispatch<AppAction>, mockMode: boolean): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        if (mockMode) {
          const tasks = getMockTasks();
          if (mounted) dispatch({ type: 'SET_TASKS', tasks });
        } else {
          const tasks = await fetchTasks();
          if (mounted) dispatch({ type: 'SET_TASKS', tasks });
        }
      } catch {
        // Silently fail — tasks are non-critical
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
