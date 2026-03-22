import { useEffect, useRef } from 'react';
import type { AppAction } from '../types.js';
import { getSSEUrl } from '../lib/api.js';
import { parseSSEProgress } from '../lib/parseEvent.js';
import { uid } from '../lib/format.js';

/**
 * Connect to the TinyAGI SSE event stream.
 * Handles reconnection automatically.
 */
export function useSSE(dispatch: React.Dispatch<AppAction>, mockMode: boolean): void {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (mockMode) return;

    let mounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!mounted) return;

      try {
        // Use native EventSource if available, otherwise manual SSE parsing
        const url = getSSEUrl();
        const controller = new AbortController();

        (async () => {
          try {
            const response = await fetch(url, {
              signal: controller.signal,
              headers: { Accept: 'text/event-stream' },
            });

            if (!response.ok || !response.body) {
              throw new Error(`SSE connection failed: ${response.status}`);
            }

            dispatch({ type: 'SET_CONNECTED', connected: true });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (mounted) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let currentEvent = '';
              let currentData = '';

              for (const line of lines) {
                if (line.startsWith('event:')) {
                  currentEvent = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  currentData += line.slice(5).trim();
                } else if (line === '') {
                  // End of event
                  if (currentEvent && currentData) {
                    handleSSEEvent(currentEvent, currentData, dispatch);
                  }
                  currentEvent = '';
                  currentData = '';
                }
              }
            }
          } catch (err: unknown) {
            if (!mounted) return;
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('abort')) return;

            dispatch({ type: 'SET_CONNECTED', connected: false });
            // Reconnect after 5s
            reconnectTimeout = setTimeout(connect, 5000);
          }
        })();

        cleanupRef.current = () => {
          controller.abort();
        };
      } catch {
        if (mounted) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [dispatch, mockMode]);
}

function handleSSEEvent(
  event: string,
  dataStr: string,
  dispatch: React.Dispatch<AppAction>,
): void {
  try {
    const data = JSON.parse(dataStr);

    switch (event) {
      case 'chain_step_start': {
        const agentId = data.agent_id || data.agentId;
        if (agentId) {
          dispatch({ type: 'UPDATE_AGENT', agentId, updates: { status: 'active', lastHeartbeat: Date.now() } });
          dispatch({
            type: 'ADD_TOAST',
            toast: { id: uid(), message: `${agentId} started working`, level: 'info', createdAt: Date.now() },
          });
        }
        break;
      }

      case 'chain_step_done': {
        const agentId = data.agent_id || data.agentId;
        if (agentId) {
          dispatch({ type: 'UPDATE_AGENT', agentId, updates: { status: 'idle', lastHeartbeat: Date.now() } });
          dispatch({
            type: 'ADD_TOAST',
            toast: { id: uid(), message: `${agentId} finished`, level: 'success', createdAt: Date.now() },
          });
        }
        break;
      }

      case 'agent_progress': {
        const agentId = data.agent_id || data.agentId;
        if (agentId) {
          const logEvent = parseSSEProgress(data, agentId);
          if (logEvent) {
            dispatch({ type: 'ADD_EVENT', agentId, event: logEvent });
          }
          dispatch({ type: 'UPDATE_AGENT', agentId, updates: { lastHeartbeat: Date.now() } });
        }
        break;
      }

      case 'agent_error': {
        const agentId = data.agent_id || data.agentId;
        if (agentId) {
          dispatch({ type: 'UPDATE_AGENT', agentId, updates: { status: 'error' } });
          dispatch({
            type: 'ADD_TOAST',
            toast: { id: uid(), message: `${agentId}: ${data.message || 'error'}`, level: 'error', createdAt: Date.now() },
          });
        }
        break;
      }

      case 'heartbeat': {
        const agentId = data.agent_id || data.agentId;
        if (agentId) {
          dispatch({ type: 'UPDATE_AGENT', agentId, updates: { lastHeartbeat: Date.now() } });
        }
        break;
      }

      case 'usage_stats':
      case 'agent_usage': {
        const agentId = data.agent_id || data.agentId;
        const mu = data.modelUsage as Record<string, Record<string, number>> | undefined;
        if (agentId && mu) {
          const model = Object.values(mu)[0];
          if (model) {
            dispatch({
              type: 'UPDATE_USAGE',
              agentId: String(agentId),
              usage: {
                inputTokens: model.inputTokens || 0,
                outputTokens: model.outputTokens || 0,
                cacheReadTokens: model.cacheReadInputTokens || 0,
                cacheCreationTokens: model.cacheCreationInputTokens || 0,
                contextWindow: model.contextWindow || 200000,
                costUSD: model.costUSD || 0,
                lastUpdated: Date.now(),
              },
            });
          }
        }
        break;
      }
    }
  } catch {
    // Ignore malformed SSE data
  }
}
