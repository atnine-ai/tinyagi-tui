import React from 'react';
import { Box, Text } from 'ink';
import type { LogEvent, ThinkEvent, ReadEvent, EditEvent, WriteEvent, BashEvent, ErrorEvent, ResponseEvent, SearchEvent } from '../types.js';
import { formatTime, formatBashDuration, shortPath, lineCount } from '../lib/format.js';

interface LogEntryProps {
  event: LogEvent;
  width: number;
}

/**
 * Renders a single log event with type-specific formatting.
 * Returns an array of lines (each line is a Text element).
 */
function LogEntryInner({ event, width }: LogEntryProps) {
  const ts = formatTime(event.timestamp);
  const contentWidth = Math.max(width - 12, 20); // timestamp + padding

  switch (event.type) {
    case 'think':
      return <ThinkEntry event={event} ts={ts} width={contentWidth} />;
    case 'read':
      return <ReadEntry event={event} ts={ts} />;
    case 'edit':
      return <EditEntry event={event} ts={ts} width={contentWidth} />;
    case 'write':
      return <WriteEntry event={event} ts={ts} />;
    case 'bash':
      return <BashEntry event={event} ts={ts} width={contentWidth} />;
    case 'error':
      return <ErrorEntry event={event} ts={ts} width={contentWidth} />;
    case 'response':
      return <ResponseEntry event={event} ts={ts} width={contentWidth} />;
    case 'search':
      return <SearchEntry event={event} ts={ts} />;
    default:
      return (
        <Box flexDirection="row">
          <Text color="#888888">{ts}  </Text>
          <Text dimColor>{'raw' in event ? String((event as { raw: string }).raw).slice(0, contentWidth) : 'unknown event'}</Text>
        </Box>
      );
  }
}

function ThinkEntry({ event, ts, width }: { event: ThinkEvent; ts: string; width: number }) {
  const lines = event.content.split('\n');
  const maxLines = event.expanded ? lines.length : 3;
  const visibleLines = lines.slice(0, maxLines);
  const hiddenCount = lines.length - maxLines;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="#888888">{ts}  </Text>
        <Text color="#af87ff" bold>THINK</Text>
      </Box>
      {visibleLines.map((line, i) => (
        <Box key={i} marginLeft={10}>
          <Text color="#a89cc8" wrap="truncate">{line.slice(0, width)}</Text>
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Box marginLeft={10}>
          <Text color="#a89cc8">{`                    ↕ +${hiddenCount} lines`}</Text>
        </Box>
      )}
    </Box>
  );
}

function ReadEntry({ event, ts }: { event: ReadEvent; ts: string }) {
  const range = event.lineStart != null && event.lineEnd != null
    ? ` Lines ${event.lineStart}-${event.lineEnd}`
    : event.lineStart != null
    ? ` Line ${event.lineStart}+`
    : '';

  return (
    <Box flexDirection="row">
      <Text color="#888888">{ts}  </Text>
      <Text color="#5fd7ff" bold>READ</Text>
      <Text>  </Text>
      <Text>{shortPath(event.file)}</Text>
      {range && <Text dimColor>{range}</Text>}
    </Box>
  );
}

function EditEntry({ event, ts, width }: { event: EditEvent; ts: string; width: number }) {
  const diffLines = event.diff.split('\n');
  const maxLines = event.expanded ? diffLines.length : 6;
  const visibleLines = diffLines.slice(0, maxLines);
  const hiddenCount = diffLines.length - maxLines;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="#888888">{ts}  </Text>
        <Text color="#ffd75f" bold>EDIT</Text>
        <Text>  </Text>
        <Text>{shortPath(event.file)}</Text>
      </Box>
      {visibleLines.map((line, i) => {
        const color = line.startsWith('+') ? '#00d787' : line.startsWith('-') ? '#ff5f5f' : undefined;
        return (
          <Box key={i} marginLeft={10}>
            <Text color={color} wrap="truncate">{line.slice(0, width)}</Text>
          </Box>
        );
      })}
      {hiddenCount > 0 && (
        <Box marginLeft={10}>
          <Text dimColor>{`                    ↕ +${hiddenCount} lines`}</Text>
        </Box>
      )}
    </Box>
  );
}

function WriteEntry({ event, ts }: { event: WriteEvent; ts: string }) {
  return (
    <Box flexDirection="row">
      <Text color="#888888">{ts}  </Text>
      <Text color="#ffd75f" bold>WRITE</Text>
      <Text>  </Text>
      <Text>{shortPath(event.file)}</Text>
      <Text dimColor>{`  ${event.lineCount} lines`}</Text>
    </Box>
  );
}

function BashEntry({ event, ts, width }: { event: BashEvent; ts: string; width: number }) {
  const exitOk = event.exitCode === 0;
  const exitIcon = exitOk ? '✓' : '✖';
  const exitColor = exitOk ? '#00d787' : '#ff5f5f';
  const duration = formatBashDuration(event.duration);

  const stdoutLines = event.stdout ? event.stdout.split('\n').filter((l) => l.trim()) : [];
  const stderrLines = event.stderr ? event.stderr.split('\n').filter((l) => l.trim()) : [];
  const maxStdout = event.expanded ? stdoutLines.length : 5;
  const visibleStdout = stdoutLines.slice(0, maxStdout);
  const hiddenStdout = stdoutLines.length - maxStdout;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="#888888">{ts}  </Text>
        <Text color="#87afff" bold>BASH</Text>
        <Text>  </Text>
        <Text wrap="truncate">{event.command.slice(0, width - 20)}</Text>
      </Box>
      <Box marginLeft={10} flexDirection="row">
        <Text color={exitColor}>{exitIcon}</Text>
        <Text>{` exit ${event.exitCode}`}</Text>
        <Text dimColor>{` (${duration})`}</Text>
      </Box>
      {visibleStdout.map((line, i) => (
        <Box key={`out-${i}`} marginLeft={10}>
          <Text dimColor wrap="truncate">{line.slice(0, width)}</Text>
        </Box>
      ))}
      {hiddenStdout > 0 && (
        <Box marginLeft={10}>
          <Text dimColor>{`                    ↕ +${hiddenStdout} lines`}</Text>
        </Box>
      )}
      {/* stderr is never collapsed */}
      {stderrLines.map((line, i) => (
        <Box key={`err-${i}`} marginLeft={10}>
          <Text color="#ff5f5f" wrap="truncate">{line.slice(0, width)}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ErrorEntry({ event, ts, width }: { event: ErrorEvent; ts: string; width: number }) {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="#888888">{ts}  </Text>
        <Text color="#ff5f5f" bold>ERROR</Text>
      </Box>
      <Box marginLeft={10}>
        <Text color="#ff5f5f" bold wrap="truncate">{event.message.slice(0, width)}</Text>
      </Box>
      {event.stack && (
        <Box marginLeft={10}>
          <Text dimColor wrap="truncate">{event.stack.slice(0, width * 2)}</Text>
        </Box>
      )}
    </Box>
  );
}

function ResponseEntry({ event, ts, width }: { event: ResponseEvent; ts: string; width: number }) {
  const lines = event.content.split('\n');
  const maxLines = event.expanded ? lines.length : 5;
  const visibleLines = lines.slice(0, maxLines);
  const hiddenCount = lines.length - maxLines;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="#888888">{ts}  </Text>
        <Text bold>RESPONSE</Text>
      </Box>
      {visibleLines.map((line, i) => (
        <Box key={i} marginLeft={10}>
          <Text wrap="truncate">{line.slice(0, width)}</Text>
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Box marginLeft={10}>
          <Text dimColor>{`                    ↕ +${hiddenCount} lines`}</Text>
        </Box>
      )}
    </Box>
  );
}

function SearchEntry({ event, ts }: { event: SearchEvent; ts: string }) {
  return (
    <Box flexDirection="row">
      <Text color="#888888">{ts}  </Text>
      <Text color="#5fd7ff" bold>SEARCH</Text>
      <Text>  </Text>
      <Text>{`"${event.query}"`}</Text>
      <Text dimColor>{`  ${event.results} results`}</Text>
    </Box>
  );
}

/**
 * Calculate how many terminal rows a log event will occupy when rendered.
 */
export function estimateEventHeight(event: LogEvent): number {
  switch (event.type) {
    case 'think': {
      const lines = event.content.split('\n');
      const shown = event.expanded ? lines.length : Math.min(lines.length, 3);
      const overflow = !event.expanded && lines.length > 3 ? 1 : 0;
      return 1 + shown + overflow; // label + content lines + overflow indicator
    }
    case 'read':
      return 1;
    case 'edit': {
      const diffLines = event.diff.split('\n');
      const shown = event.expanded ? diffLines.length : Math.min(diffLines.length, 6);
      const overflow = !event.expanded && diffLines.length > 6 ? 1 : 0;
      return 1 + shown + overflow;
    }
    case 'write':
      return 1;
    case 'bash': {
      const stdoutLines = event.stdout ? event.stdout.split('\n').filter((l) => l.trim()).length : 0;
      const stderrLines = event.stderr ? event.stderr.split('\n').filter((l) => l.trim()).length : 0;
      const shownStdout = event.expanded ? stdoutLines : Math.min(stdoutLines, 5);
      const overflowStdout = !event.expanded && stdoutLines > 5 ? 1 : 0;
      return 2 + shownStdout + overflowStdout + stderrLines; // label + exit line + stdout + stderr
    }
    case 'error': {
      const stackLines = event.stack ? 1 : 0;
      return 2 + stackLines; // label + message + optional stack
    }
    case 'response': {
      const lines = event.content.split('\n');
      const shown = event.expanded ? lines.length : Math.min(lines.length, 5);
      const overflow = !event.expanded && lines.length > 5 ? 1 : 0;
      return 1 + shown + overflow;
    }
    case 'search':
      return 1;
    default:
      return 1;
  }
}

export const LogEntry = React.memo(LogEntryInner);
