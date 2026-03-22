import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types.js';
import { timeSince, truncate } from '../lib/format.js';

interface AgentSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  focused: boolean;
  height: number;
  compact: boolean; // abbreviate names at narrow widths
  multiSelectMode?: boolean;
  selectedAgentIds?: Set<string>;
}

const STATUS_ICONS: Record<Agent['status'], { icon: string; color: string }> = {
  active: { icon: '▲', color: '#00d787' },
  idle: { icon: '●', color: '#d7af00' },
  error: { icon: '✖', color: '#ff5f5f' },
  stale: { icon: '◌', color: '#808080' },
};

const SIDEBAR_WIDTH = 24;

function AgentSidebarInner({ agents, selectedAgentId, focused, height, compact, multiSelectMode, selectedAgentIds }: AgentSidebarProps) {
  // Group agents by team
  const teams = new Map<string, Agent[]>();
  for (const agent of agents) {
    const team = agent.team || 'default';
    if (!teams.has(team)) teams.set(team, []);
    teams.get(team)!.push(agent);
  }

  const rows: React.ReactNode[] = [];
  let rowIndex = 0;

  for (const [teamName, teamAgents] of teams) {
    // Team header
    rows.push(
      <Box key={`team-${teamName}`} width={SIDEBAR_WIDTH - 2}>
        <Text bold dimColor>{compact ? truncate(teamName, 14) : truncate(teamName, SIDEBAR_WIDTH - 4)}</Text>
      </Box>
    );
    rowIndex++;

    for (const agent of teamAgents) {
      const isSelected = agent.id === selectedAgentId;
      const si = STATUS_ICONS[agent.status];
      const heartbeat = timeSince(agent.lastHeartbeat);
      const isMultiSelected = multiSelectMode && selectedAgentIds?.has(agent.id);
      const checkbox = multiSelectMode ? (isMultiSelected ? '\u2611 ' : '\u2610 ') : '';
      const nameMaxLen = compact ? 6 : (multiSelectMode ? 8 : 10);
      const displayName = truncate(agent.name, nameMaxLen);

      rows.push(
        <Box
          key={agent.id}
          width={SIDEBAR_WIDTH - 2}
          flexDirection="row"
          justifyContent="space-between"
        >
          <Box>
            <Text
              backgroundColor={isSelected ? '#1e4d7a' : undefined}
              color={isSelected ? 'white' : undefined}
            >
              {multiSelectMode && <Text color={isMultiSelected ? '#00d787' : '#808080'}>{checkbox}</Text>}
              <Text color={si.color}>{si.icon}</Text>
              <Text>{` ${displayName}`}</Text>
            </Text>
          </Box>
          <Box>
            <Text
              dimColor
              backgroundColor={isSelected ? '#1e4d7a' : undefined}
            >
              {heartbeat}
            </Text>
          </Box>
        </Box>
      );
      rowIndex++;
    }

    // Spacer between teams
    rows.push(<Box key={`spacer-${teamName}`} height={1} />);
    rowIndex++;
  }

  // Shortcut list for bottom section
  const shortcuts: [string, string][] = [
    ['/', 'message'],
    ['s', 'timeline'],
    ['m', 'agent chat'],
    ['d', 'git diff'],
    ['$', 'cost'],
    ['p', 'pin event'],
    ['f', 'zen mode'],
    ['e', 'expand'],
    ['?', 'all keys'],
  ];
  const shortcutRows = shortcuts.length + 1; // +1 for separator

  // Pad remaining height with empty space
  const usedRows = rowIndex;
  const remainingRows = Math.max(0, height - usedRows - 1);
  const fillHeight = Math.max(0, remainingRows - shortcutRows);

  return (
    <Box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      height={height}
      borderStyle={focused ? 'single' : undefined}
      borderColor={focused ? '#5fd7ff' : undefined}
      paddingLeft={1}
    >
      <Box marginBottom={0}>
        <Text bold underline dimColor>AGENTS</Text>
        {focused && <Text color="#5fd7ff"> [j/k]</Text>}
      </Box>
      {rows}
      {fillHeight > 0 && <Box height={fillHeight} />}
      <Box flexDirection="column">
        <Text color="#444444">{'─'.repeat(SIDEBAR_WIDTH - 3)}</Text>
        {shortcuts.map(([key, label]) => (
          <Box key={key} flexDirection="row" width={SIDEBAR_WIDTH - 3}>
            <Text color="#5fd7ff">{`[${key}]`}</Text>
            <Text color="#888888">{` ${label}`}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export const AgentSidebar = React.memo(AgentSidebarInner);
