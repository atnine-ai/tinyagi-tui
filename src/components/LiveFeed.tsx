import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { LogEvent, FilterMode } from '../types.js';
import { LogEntry, estimateEventHeight } from './LogEntry.js';
import { eventMatchesFilter } from '../lib/parseEvent.js';

interface LiveFeedProps {
  events: LogEvent[];
  agentName: string;
  filterMode: FilterMode;
  height: number;
  width: number;
  scrollOffset: number;
  autoScrollEnabled: boolean;
  focused: boolean;
  pinnedEventIds?: Set<string>;
}

function LiveFeedInner({
  events,
  agentName,
  filterMode,
  height,
  width,
  scrollOffset,
  autoScrollEnabled,
  focused,
  pinnedEventIds,
}: LiveFeedProps) {
  // Filter events
  const filtered = useMemo(
    () => events.filter((e) => eventMatchesFilter(e, filterMode)),
    [events, filterMode]
  );

  // Pinned events for display
  const pinnedEventsForDisplay = useMemo(() => {
    if (!pinnedEventIds || pinnedEventIds.size === 0) return [];
    return events.filter((e) => pinnedEventIds.has(e.id));
  }, [events, pinnedEventIds]);

  const pinnedHeight = useMemo(() => {
    if (pinnedEventsForDisplay.length === 0) return 0;
    // 1 for "Pinned" header + 1 for separator + event heights
    return 2 + pinnedEventsForDisplay.reduce((acc, e) => acc + estimateEventHeight(e), 0);
  }, [pinnedEventsForDisplay]);

  // Calculate which events are visible using windowing
  const { visibleEvents, totalHeight } = useMemo(() => {
    if (filtered.length === 0) {
      return { visibleEvents: [] as LogEvent[], totalHeight: 0 };
    }

    // Calculate heights of all events
    const heights = filtered.map((e) => estimateEventHeight(e));
    const totalH = heights.reduce((a, b) => a + b, 0);
    const availableHeight = Math.max(height - 2 - pinnedHeight, 5); // minus header, scroll indicator, and pinned section

    // Determine visible window
    let startIdx: number;
    if (autoScrollEnabled || scrollOffset < 0) {
      // Auto-scroll: show last events that fit
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

    // Collect events that fit in the available height
    const visible: LogEvent[] = [];
    let usedHeight = 0;
    for (let i = startIdx; i < filtered.length; i++) {
      const h = heights[i]!;
      if (usedHeight + h > availableHeight && visible.length > 0) break;
      visible.push(filtered[i]!);
      usedHeight += h;
    }

    return { visibleEvents: visible, totalHeight: totalH };
  }, [filtered, height, scrollOffset, autoScrollEnabled, pinnedHeight]);

  const contentWidth = Math.max(width - 4, 20);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle={focused ? 'single' : undefined}
      borderColor={focused ? '#5fd7ff' : undefined}
      paddingLeft={1}
      paddingRight={1}
    >
      {/* Feed header */}
      <Box flexDirection="row" justifyContent="space-between" width={contentWidth}>
        <Box>
          <Text bold dimColor>LIVE FEED</Text>
          <Text dimColor> — </Text>
          <Text color="#5fd7ff" bold>@{agentName}</Text>
        </Box>
        <Box>
          {autoScrollEnabled ? (
            <Text dimColor>AUTO ↓</Text>
          ) : (
            <Text color="#d7af00">PAUSED</Text>
          )}
          <Text dimColor>{`  ${filtered.length} events`}</Text>
        </Box>
      </Box>

      {/* Pinned events section */}
      {pinnedEventsForDisplay.length > 0 && (
        <Box flexDirection="column">
          <Text bold dimColor>* Pinned</Text>
          {pinnedEventsForDisplay.map((event) => (
            <Box key={`pin-${event.id}`} flexDirection="row">
              <Text dimColor>* </Text>
              <LogEntry event={event} width={contentWidth - 2} />
            </Box>
          ))}
          <Text dimColor>{'\u2500'.repeat(Math.min(contentWidth, 40))}</Text>
        </Box>
      )}

      {/* Event list */}
      {visibleEvents.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>No events yet. Waiting for agent activity...</Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {visibleEvents.map((event) => {
            const isPinned = pinnedEventIds?.has(event.id) || false;
            return (
              <Box key={event.id} flexDirection="row">
                {isPinned && <Text dimColor>* </Text>}
                <LogEntry event={event} width={isPinned ? contentWidth - 2 : contentWidth} />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Scroll indicator */}
      {filtered.length > 0 && (
        <Box flexDirection="row" justifyContent="center">
          <Text dimColor>
            {autoScrollEnabled
              ? '[Space] pause  [G] bottom  [e] expand'
              : '[Space] resume  [↑/↓] scroll  [G] bottom'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export const LiveFeed = React.memo(LiveFeedInner);
