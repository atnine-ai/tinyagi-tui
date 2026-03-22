import React from 'react';
import { Box, Text } from 'ink';
import type { Agent, Task, FilterMode, SystemStats } from '../types.js';

interface HeaderBarProps {
  agents: Agent[];
  tasks: Task[];
  connected: boolean;
  mockMode: boolean;
  filterMode: FilterMode;
  width: number;
  systemStats: SystemStats | null;
}

const FILTER_LABELS: Record<FilterMode, string> = {
  all: 'ALL',
  edits: 'EDITS',
  bash: 'BASH',
  errors: 'ERRORS',
  thinking: 'THINK',
  actions: 'ACTIONS',
};

function HeaderBarInner({ agents, tasks, connected, mockMode, filterMode, width, systemStats }: HeaderBarProps) {
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const idleCount = agents.filter((a) => a.status === 'idle').length;
  const errorCount = agents.filter((a) => a.status === 'error').length;

  const backlog = tasks.filter((t) => t.status === 'backlog').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const review = tasks.filter((t) => t.status === 'review').length;
  const done = tasks.filter((t) => t.status === 'done').length;

  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Box
      flexDirection="column"
      width={width}
      height={2}
    >
      <Box flexDirection="row" justifyContent="space-between" width={width}>
        <Box>
          <Text bold color="#5fd7ff">TinyAGI TUI</Text>
          {mockMode && <Text color="#ffd75f" dimColor> [MOCK]</Text>}
          {!connected && !mockMode && <Text color="#ff5f5f"> [DISCONNECTED]</Text>}
          <Text dimColor>  </Text>
          <Text color="#00d787">{`▲ ${activeCount} active`}</Text>
          <Text dimColor>  </Text>
          <Text color="#d7af00">{`● ${idleCount} idle`}</Text>
          {errorCount > 0 && (
            <>
              <Text dimColor>  </Text>
              <Text color="#ff5f5f">{`✖ ${errorCount} error`}</Text>
            </>
          )}
        </Box>
        <Box>
          <Text dimColor>Tasks: </Text>
          <Text color="#808080">{`${backlog} backlog`}</Text>
          <Text dimColor>  </Text>
          <Text color="#00d787">{`${inProgress} in_progress`}</Text>
          {review > 0 && (
            <>
              <Text dimColor>  </Text>
              <Text color="#d7af00">{`${review} review`}</Text>
            </>
          )}
          <Text dimColor>  </Text>
          <Text dimColor>{`${done} done`}</Text>
          <Text dimColor>  │  </Text>
          {systemStats ? (
            <>
              <Text dimColor>CPU:</Text>
              <Text color={systemStats.cpuUsage > 80 ? '#ff5f5f' : systemStats.cpuUsage > 50 ? '#ffd75f' : '#00d787'}>
                {` ${systemStats.cpuUsage}%`}
              </Text>
              <Text dimColor>  RAM:</Text>
              <Text color={systemStats.memUsed / systemStats.memTotal > 0.85 ? '#ff5f5f' : '#00d787'}>
                {` ${(systemStats.memUsed / 1073741824).toFixed(1)}/${(systemStats.memTotal / 1073741824).toFixed(0)}G`}
              </Text>
            </>
          ) : (
            <Text dimColor>CPU: --  RAM: --</Text>
          )}
          <Text dimColor>  </Text>
          <Text dimColor>{clock}</Text>
        </Box>
      </Box>
      <Box width={width}>
        <Text dimColor>{'─'.repeat(Math.max(width, 40))}</Text>
      </Box>
    </Box>
  );
}

export const HeaderBar = React.memo(HeaderBarInner);
