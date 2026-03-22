import { useEffect, useRef } from 'react';
import { execSync } from 'node:child_process';
import type { Agent, AppAction } from '../types.js';

const POLL_INTERVAL = 15_000; // check every 15s — branches don't change that fast

/**
 * Poll git branch for each agent's working directory.
 * Uses `git rev-parse --abbrev-ref HEAD` in each agent's workspace.
 */
export function useGitBranch(
  dispatch: React.Dispatch<AppAction>,
  agents: Agent[],
  mockMode: boolean,
): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mockMode) return;

    function pollBranches() {
      for (const agent of agents) {
        if (!agent.workingDirectory) continue;
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: agent.workingDirectory,
            encoding: 'utf-8',
            timeout: 3000,
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim();

          if (branch && branch !== agent.gitBranch) {
            dispatch({
              type: 'UPDATE_AGENT',
              agentId: agent.id,
              updates: { gitBranch: branch },
            });
          }
        } catch {
          // Not a git repo or git not available — skip silently
        }
      }
    }

    pollBranches();
    timerRef.current = setInterval(pollBranches, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dispatch, agents, mockMode]);
}
