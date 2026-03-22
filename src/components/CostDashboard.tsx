import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Agent } from '../types.js';
import { truncate } from '../lib/format.js';
import { ModalBox } from './ModalBox.js';

interface CostDashboardProps {
  agents: Agent[];
  width: number;
  height: number;
  onClose: () => void;
}

interface TeamCostRow {
  team: string;
  agents: {
    name: string;
    status: Agent['status'];
    contextPct: number;
    costUSD: number;
  }[];
  totalCost: number;
}

const STATUS_COLORS: Record<Agent['status'], string> = {
  active: '#00d787',
  idle: '#d7af00',
  error: '#ff5f5f',
  stale: '#808080',
};

function CostDashboardInner({ agents, width, height, onClose }: CostDashboardProps) {
  useInput((input, key) => {
    if (key.escape || input === '$') onClose();
  });

  const { teamRows, grandTotal } = useMemo(() => {
    const teams = new Map<string, TeamCostRow>();
    for (const agent of agents) {
      const teamName = agent.team || 'default';
      if (!teams.has(teamName)) teams.set(teamName, { team: teamName, agents: [], totalCost: 0 });
      const row = teams.get(teamName)!;
      const usage = agent.usage;
      const used = usage ? usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens : 0;
      const total = usage?.contextWindow || 200000;
      const contextPct = total > 0 ? Math.min(Math.round((used / total) * 100), 999) : 0;
      const costUSD = usage?.costUSD || 0;
      row.agents.push({ name: agent.name, status: agent.status, contextPct, costUSD });
      row.totalCost += costUSD;
    }
    let total = 0;
    for (const row of teams.values()) total += row.totalCost;
    return { teamRows: Array.from(teams.values()), grandTotal: total };
  }, [agents]);

  const colName = 14;
  const colStatus = 8;
  const colCtx = 8;
  const colCost = 12;
  const tableWidth = colName + colStatus + colCtx + colCost + 4;

  return (
    <ModalBox title="Cost Dashboard" width={width} height={height} footer="[$/Esc] close">
      {/* Table header */}
      <Box flexDirection="row">
        <Text bold color="#888888">{'Agent'.padEnd(colName)}</Text>
        <Text bold color="#888888">{'Status'.padEnd(colStatus)}</Text>
        <Text bold color="#888888">{'Context'.padEnd(colCtx)}</Text>
        <Text bold color="#888888">{'Cost'.padEnd(colCost)}</Text>
      </Box>
      <Text color="#444444">{'─'.repeat(tableWidth)}</Text>

      {teamRows.map((teamRow) => (
        <Box key={teamRow.team} flexDirection="column">
          <Box flexDirection="row">
            <Text bold color="#5fd7ff">{truncate(teamRow.team, tableWidth)}</Text>
          </Box>
          {teamRow.agents.map((agent, i) => {
            const ctxColor = agent.contextPct < 50 ? '#00d787' : agent.contextPct < 80 ? '#ffd75f' : '#ff5f5f';
            return (
              <Box key={`${teamRow.team}-${i}`} flexDirection="row" marginLeft={2}>
                <Text>{truncate(agent.name, colName - 2).padEnd(colName - 2)}</Text>
                <Text>  </Text>
                <Text color={STATUS_COLORS[agent.status]}>{agent.status.padEnd(colStatus)}</Text>
                <Text color={ctxColor}>{`${agent.contextPct}%`.padEnd(colCtx)}</Text>
                <Text>{`$${agent.costUSD.toFixed(4)}`.padEnd(colCost)}</Text>
              </Box>
            );
          })}
          <Box flexDirection="row" marginLeft={2}>
            <Text color="#888888">{''.padEnd(colName - 2 + 2 + colStatus + colCtx)}</Text>
            <Text color="#888888" bold>{`$${teamRow.totalCost.toFixed(4)}`}</Text>
          </Box>
        </Box>
      ))}

      <Text color="#444444">{'─'.repeat(tableWidth)}</Text>
      <Box flexDirection="row" justifyContent="space-between" width={tableWidth}>
        <Text bold>Grand Total</Text>
        <Text bold color="#ffd75f">{`$${grandTotal.toFixed(4)}`}</Text>
      </Box>
    </ModalBox>
  );
}

export const CostDashboard = React.memo(CostDashboardInner);
