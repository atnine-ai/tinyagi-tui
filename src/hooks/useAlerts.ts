import { useEffect, useRef } from 'react';
import type { Agent, AppAction, LogEvent } from '../types.js';
import { uid } from '../lib/format.js';

const CHECK_INTERVAL = 5_000;
const ALERT_COOLDOWN = 60_000; // Don't repeat same alert within 60s
const STUCK_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const ERROR_WINDOW = 10 * 60 * 1000; // 10 minutes
const ERROR_COUNT_THRESHOLD = 3;
const CONTEXT_THRESHOLD = 80; // percent

/**
 * Background alert engine that checks thresholds and generates toasts.
 */
export function useAlerts(
  dispatch: React.Dispatch<AppAction>,
  agents: Agent[],
  eventBuffers: Map<string, LogEvent[]>,
): void {
  const firedAlertsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    function canFire(alertKey: string): boolean {
      const lastFired = firedAlertsRef.current.get(alertKey);
      if (!lastFired) return true;
      return Date.now() - lastFired > ALERT_COOLDOWN;
    }

    function fireAlert(alertKey: string, message: string, level: 'warning' | 'error'): void {
      if (!canFire(alertKey)) return;
      firedAlertsRef.current.set(alertKey, Date.now());
      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: uid(),
          message,
          level,
          createdAt: Date.now(),
        },
      });
    }

    function checkAlerts() {
      const now = Date.now();

      for (const agent of agents) {
        // Check 1: Context usage > 80%
        if (agent.usage) {
          const used = agent.usage.inputTokens + agent.usage.outputTokens +
            agent.usage.cacheReadTokens + agent.usage.cacheCreationTokens;
          const total = agent.usage.contextWindow;
          const pct = total > 0 ? Math.round((used / total) * 100) : 0;
          if (pct > CONTEXT_THRESHOLD) {
            fireAlert(
              `ctx-${agent.id}`,
              `${agent.name} context at ${pct}%`,
              'warning',
            );
          }
        }

        // Check 2: Agent may be stuck (active but no events in 5 minutes)
        if (agent.status === 'active') {
          const events = eventBuffers.get(agent.id) || [];
          const lastEvent = events.length > 0 ? events[events.length - 1] : null;
          if (lastEvent && now - lastEvent.timestamp > STUCK_THRESHOLD) {
            fireAlert(
              `stuck-${agent.id}`,
              `${agent.name} may be stuck`,
              'warning',
            );
          } else if (!lastEvent && now - agent.lastHeartbeat > STUCK_THRESHOLD) {
            fireAlert(
              `stuck-${agent.id}`,
              `${agent.name} may be stuck`,
              'warning',
            );
          }
        }

        // Check 3: 3+ errors in last 10 minutes
        const events = eventBuffers.get(agent.id) || [];
        const recentErrors = events.filter(
          (e) => e.type === 'error' && now - e.timestamp < ERROR_WINDOW
        );
        if (recentErrors.length >= ERROR_COUNT_THRESHOLD) {
          fireAlert(
            `errors-${agent.id}`,
            `${agent.name}: repeated errors (${recentErrors.length})`,
            'error',
          );
        }
      }
    }

    const timer = setInterval(checkAlerts, CHECK_INTERVAL);
    // Run once immediately
    checkAlerts();

    return () => clearInterval(timer);
  }, [dispatch, agents, eventBuffers]);
}
