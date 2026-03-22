import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { LogEvent, Agent } from '../types.js';
import { formatTime } from '../lib/format.js';
import { ModalBox } from './ModalBox.js';

interface TimelineProps {
  eventBuffers: Map<string, LogEvent[]>;
  agents: Agent[];
  width: number;
  height: number;
  onClose: () => void;
}

interface TimelineEntry {
  timestamp: number;
  agentId: string;
  agentName: string;
  agentStatus: Agent['status'];
  summary: string;
  type: LogEvent['type'];
}

const STATUS_COLORS: Record<Agent['status'], string> = {
  active: '#00d787',
  idle: '#d7af00',
  error: '#ff5f5f',
  stale: '#808080',
};

const TYPE_COLORS: Record<string, string> = {
  response: '#ffffff',
  error: '#ff5f5f',
  edit: '#ffd75f',
  write: '#ffd75f',
  bash: '#87afff',
};

const MAX_TIMELINE_EVENTS = 100;

function isSignificantEvent(event: LogEvent): boolean {
  if (event.type === 'response') return true;
  if (event.type === 'error') return true;
  if (event.type === 'edit') return true;
  if (event.type === 'write') return true;
  if (event.type === 'bash' && event.exitCode !== 0) return true;
  return false;
}

function summarizeEvent(event: LogEvent): string {
  switch (event.type) {
    case 'response':
      return event.content.split('\n')[0]!.slice(0, 60) + (event.content.length > 60 ? '...' : '');
    case 'error':
      return event.message.slice(0, 60);
    case 'edit':
      return `edited ${event.file} (+${event.linesAdded}/-${event.linesRemoved})`;
    case 'write':
      return `wrote ${event.file} (${event.lineCount} lines)`;
    case 'bash':
      return `$ ${event.command} (exit ${event.exitCode})`;
    default:
      return 'event';
  }
}

function TimelineInner({ eventBuffers, agents, width, height, onClose }: TimelineProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) map.set(agent.id, agent);
    return map;
  }, [agents]);

  const entries = useMemo(() => {
    const allEntries: TimelineEntry[] = [];
    for (const [agentId, events] of eventBuffers) {
      const agent = agentMap.get(agentId);
      const agentName = agent?.name || agentId;
      const agentStatus = agent?.status || 'stale';
      for (const event of events) {
        if (isSignificantEvent(event)) {
          allEntries.push({
            timestamp: event.timestamp,
            agentId, agentName, agentStatus,
            summary: summarizeEvent(event),
            type: event.type,
          });
        }
      }
    }
    allEntries.sort((a, b) => b.timestamp - a.timestamp);
    return allEntries.slice(0, MAX_TIMELINE_EVENTS);
  }, [eventBuffers, agentMap]);

  const visibleCount = Math.max(height - 8, 3);

  useInput((input, key) => {
    if (key.escape || input === 's') { onClose(); return; }
    if (input === 'j' || key.downArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, entries.length - visibleCount)));
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
    }
  });

  const visibleEntries = entries.slice(scrollOffset, scrollOffset + visibleCount);
  const contentWidth = width - 36;
  const footer = entries.length > visibleCount
    ? `[j/k] scroll  [${scrollOffset + 1}-${Math.min(scrollOffset + visibleCount, entries.length)}/${entries.length}]  [s/Esc] close`
    : '[s/Esc] close';

  return (
    <ModalBox title={`Activity Timeline (${entries.length} events)`} width={width} height={height} footer={footer}>
      {entries.length === 0 ? (
        <Box justifyContent="center" flexGrow={1}>
          <Text color="#888888">No significant events yet...</Text>
        </Box>
      ) : (
        visibleEntries.map((entry, i) => {
          const ts = formatTime(entry.timestamp);
          const nameColor = STATUS_COLORS[entry.agentStatus] || '#808080';
          const typeColor = TYPE_COLORS[entry.type] || '#808080';
          return (
            <Box key={`${entry.timestamp}-${entry.agentId}-${i}`} flexDirection="row">
              <Text color="#888888">{ts}</Text>
              <Text> </Text>
              <Text color={nameColor} bold>{`@${entry.agentName}`.padEnd(12)}</Text>
              <Text> </Text>
              <Text color={typeColor} wrap="truncate">{entry.summary.slice(0, contentWidth)}</Text>
            </Box>
          );
        })
      )}
    </ModalBox>
  );
}

export const Timeline = React.memo(TimelineInner);
