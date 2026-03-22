import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Agent, Task, LogEvent } from '../types.js';
import { formatDuration, formatTime, shortPath, timeSince } from '../lib/format.js';

interface DetailPanelProps {
  agent: Agent | null;
  tasks: Task[];
  events: LogEvent[];
  height: number;
}

const PANEL_WIDTH = 32;

function DetailPanelInner({ agent, tasks, events, height }: DetailPanelProps) {
  // Find current task
  const currentTask = useMemo(() => {
    if (!agent?.currentTaskId) return null;
    return tasks.find((t) => t.id === agent.currentTaskId) || null;
  }, [agent, tasks]);

  // Agent's task (fallback: first in_progress task assigned to this agent)
  const agentTask = useMemo(() => {
    if (currentTask) return currentTask;
    if (!agent) return null;
    return tasks.find((t) => t.agentId === agent.id && t.status === 'in_progress') || null;
  }, [currentTask, agent, tasks]);

  // Recent files (last 5 unique files touched)
  const recentFiles = useMemo(() => {
    const files: { name: string; time: number }[] = [];
    const seen = new Set<string>();
    for (let i = events.length - 1; i >= 0 && files.length < 5; i--) {
      const e = events[i]!;
      let file: string | undefined;
      if (e.type === 'read') file = e.file;
      else if (e.type === 'edit') file = e.file;
      else if (e.type === 'write') file = e.file;
      if (file && !seen.has(file)) {
        seen.add(file);
        files.push({ name: file, time: e.timestamp });
      }
    }
    return files;
  }, [events]);

  // Stats
  const stats = useMemo(() => {
    let edits = 0, commands = 0, errors = 0;
    for (const e of events) {
      if (e.type === 'edit' || e.type === 'write') edits++;
      else if (e.type === 'bash') commands++;
      else if (e.type === 'error') errors++;
    }
    return { total: events.length, edits, commands, errors };
  }, [events]);

  if (!agent) {
    return (
      <Box
        flexDirection="column"
        width={PANEL_WIDTH}
        height={height}
        paddingLeft={1}
      >
        <Text bold dimColor underline>DETAIL</Text>
        <Box marginTop={1}>
          <Text dimColor>No agent selected</Text>
        </Box>
      </Box>
    );
  }

  const statusColor = agent.status === 'active' ? '#00d787'
    : agent.status === 'idle' ? '#d7af00'
    : agent.status === 'error' ? '#ff5f5f'
    : '#808080';

  const uptime = formatDuration(Date.now() - agent.sessionStart);

  return (
    <Box
      flexDirection="column"
      width={PANEL_WIDTH}
      height={height}
      paddingLeft={1}
    >
      <Text bold dimColor underline>DETAIL</Text>

      {/* Agent info */}
      <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row">
          <Text dimColor>Agent: </Text>
          <Text bold>{agent.name}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Team:  </Text>
          <Text>{agent.team}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Status:</Text>
          <Text color={statusColor}>{` ${agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}`}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Uptime:</Text>
          <Text>{` ${uptime}`}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Heartbeat: </Text>
          <Text>{timeSince(agent.lastHeartbeat)}</Text>
        </Box>
        {agent.gitBranch && (
          <Box flexDirection="row">
            <Text dimColor>Branch:</Text>
            <Text color="#af87ff">{` ${agent.gitBranch.length > PANEL_WIDTH - 12 ? agent.gitBranch.slice(0, PANEL_WIDTH - 15) + '…' : agent.gitBranch}`}</Text>
          </Box>
        )}
      </Box>

      {/* Current task */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold dimColor>Current Task</Text>
        {agentTask ? (
          <>
            <Text wrap="truncate">{agentTask.name.slice(0, PANEL_WIDTH - 3)}</Text>
            <Text color={agentTask.status === 'in_progress' ? '#00d787' : '#d7af00'}>
              {agentTask.status}
            </Text>
            {agentTask.startedAt && (
              <Text dimColor>{`Started ${timeSince(agentTask.startedAt)} ago`}</Text>
            )}
          </>
        ) : (
          <Text dimColor>None</Text>
        )}
      </Box>

      {/* Recent files */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold dimColor>Recent Files</Text>
        {recentFiles.length === 0 ? (
          <Text dimColor>None</Text>
        ) : (
          recentFiles.map((f, i) => (
            <Box key={i} flexDirection="row" justifyContent="space-between" width={PANEL_WIDTH - 3}>
              <Text wrap="truncate">{shortPath(f.name).slice(0, PANEL_WIDTH - 12)}</Text>
              <Text dimColor>{formatTime(f.time).slice(0, 5)}</Text>
            </Box>
          ))
        )}
      </Box>

      {/* Context / Usage */}
      {agent.usage && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold dimColor>Context</Text>
          {(() => {
            const u = agent.usage;
            const used = u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens;
            const total = u.contextWindow;
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            const usedK = (used / 1000).toFixed(0);
            const totalK = (total / 1000).toFixed(0);
            const barWidth = PANEL_WIDTH - 6;
            const filled = Math.min(Math.round((pct / 100) * barWidth), barWidth);
            const filledBar = '█'.repeat(filled);
            const emptyBar = '░'.repeat(Math.max(barWidth - filled, 0));
            const barColor = pct < 50 ? '#00d787' : pct < 80 ? '#ffd75f' : '#ff5f5f';
            return (
              <>
                <Box flexDirection="row">
                  <Text dimColor>{`${usedK}k / ${totalK}k `}</Text>
                  <Text color={barColor}>{`(${pct}%)`}</Text>
                </Box>
                <Text><Text color={barColor}>{filledBar}</Text><Text color="#444444">{emptyBar}</Text></Text>
                <Box flexDirection="row">
                  <Text dimColor>Cost: </Text>
                  <Text>{`$${u.costUSD.toFixed(4)}`}</Text>
                </Box>
              </>
            );
          })()}
        </Box>
      )}

      {/* Stats */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold dimColor>Stats</Text>
        <Box flexDirection="row">
          <Text dimColor>Events: </Text>
          <Text>{stats.total}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Edits:  </Text>
          <Text>{stats.edits}</Text>
        </Box>
        <Box flexDirection="row">
          <Text dimColor>Commands:</Text>
          <Text>{` ${stats.commands}`}</Text>
        </Box>
        {stats.errors > 0 && (
          <Box flexDirection="row">
            <Text dimColor>Errors: </Text>
            <Text color="#ff5f5f">{stats.errors}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export const DetailPanel = React.memo(DetailPanelInner);
