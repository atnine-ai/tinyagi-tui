import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { LogEvent, FilterMode } from '../types.js';
import { LogEntry, estimateEventHeight } from './LogEntry.js';
import { eventMatchesFilter } from '../lib/parseEvent.js';

interface ZenModeProps {
  events: LogEvent[];
  agentName: string;
  filterMode: FilterMode;
  height: number;
  width: number;
  autoScrollEnabled: boolean;
  scrollOffset: number;
}

function ZenModeInner({
  events,
  agentName,
  filterMode,
  height,
  width,
  autoScrollEnabled,
  scrollOffset,
}: ZenModeProps) {
  const filtered = useMemo(
    () => events.filter((e) => eventMatchesFilter(e, filterMode)),
    [events, filterMode]
  );

  const visibleEvents = useMemo(() => {
    if (filtered.length === 0) return [];
    const heights = filtered.map((e) => estimateEventHeight(e));
    const availableHeight = Math.max(height - 4, 5);

    let startIdx: number;
    if (autoScrollEnabled || scrollOffset < 0) {
      let accumulated = 0;
      startIdx = filtered.length;
      for (let i = filtered.length - 1; i >= 0; i--) {
        accumulated += heights[i]!;
        if (accumulated > availableHeight) {
          startIdx = i + 1;
          break;
        }
        startIdx = i;
      }
    } else {
      startIdx = Math.max(0, Math.min(scrollOffset, filtered.length - 1));
    }

    const visible: LogEvent[] = [];
    let usedHeight = 0;
    for (let i = startIdx; i < filtered.length; i++) {
      const h = heights[i]!;
      if (usedHeight + h > availableHeight && visible.length > 0) break;
      visible.push(filtered[i]!);
      usedHeight += h;
    }
    return visible;
  }, [filtered, height, autoScrollEnabled, scrollOffset]);

  const contentWidth = width - 4;

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={2}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text bold color="#5fd7ff">ZEN MODE</Text>
          <Text dimColor> — </Text>
          <Text bold>@{agentName}</Text>
        </Box>
        <Box>
          <Text dimColor>{`${filtered.length} events`}</Text>
          <Text dimColor>  </Text>
          {autoScrollEnabled ? (
            <Text dimColor>AUTO ↓</Text>
          ) : (
            <Text color="#d7af00">PAUSED</Text>
          )}
          <Text dimColor>  [f/Esc] exit zen</Text>
        </Box>
      </Box>

      <Box>
        <Text dimColor>{'─'.repeat(contentWidth)}</Text>
      </Box>

      {/* Events */}
      {visibleEvents.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>Waiting for events...</Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {visibleEvents.map((event) => (
            <LogEntry key={event.id} event={event} width={contentWidth} />
          ))}
        </Box>
      )}

      <Box flexDirection="row" justifyContent="center">
        <Text dimColor>[Space] pause/resume  [G] bottom  [e] expand  [f/Esc] exit zen</Text>
      </Box>
    </Box>
  );
}

export const ZenMode = React.memo(ZenModeInner);
