import type { LogEvent } from '../types.js';
import { uid } from './format.js';

/**
 * Parse a JSONL line into a typed LogEvent.
 *
 * Expected JSONL shapes from TinyAGI:
 * {"type":"tool_use","tool":"Read","input":{"file_path":"...","line_start":1,"line_end":48},"timestamp":"..."}
 * {"type":"tool_use","tool":"Edit","input":{"file_path":"...","old_string":"...","new_string":"..."},"timestamp":"..."}
 * {"type":"tool_use","tool":"Write","input":{"file_path":"...","content":"..."},"timestamp":"..."}
 * {"type":"tool_use","tool":"Bash","input":{"command":"..."},"exit_code":0,"duration_ms":3400,"stdout":"...","stderr":"...","timestamp":"..."}
 * {"type":"thinking","content":"...","timestamp":"..."}
 * {"type":"response","content":"...","timestamp":"..."}
 * {"type":"error","message":"...","stack":"...","timestamp":"..."}
 */
export function parseJSONLLine(line: string, agentId: string): LogEvent | null {
  if (!line.trim()) return null;

  try {
    const raw = JSON.parse(line);
    const timestamp = raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now();
    const id = uid();
    const base = { id, agentId, timestamp, expanded: false };

    // Tool use events
    if (raw.type === 'tool_use' || raw.type === 'tool_call') {
      const tool = (raw.tool || raw.name || '').toLowerCase();

      if (tool === 'read' || tool === 'grep' || tool === 'glob') {
        return {
          ...base,
          type: 'read' as const,
          file: raw.input?.file_path || raw.input?.path || raw.input?.pattern || 'unknown',
          lineStart: raw.input?.line_start ?? raw.input?.offset,
          lineEnd: raw.input?.line_end ?? raw.input?.limit,
        };
      }

      if (tool === 'edit') {
        const oldStr = raw.input?.old_string || '';
        const newStr = raw.input?.new_string || '';
        const diffLines: string[] = [];
        if (oldStr) oldStr.split('\n').forEach((l: string) => diffLines.push(`-${l}`));
        if (newStr) newStr.split('\n').forEach((l: string) => diffLines.push(`+${l}`));
        return {
          ...base,
          type: 'edit' as const,
          file: raw.input?.file_path || 'unknown',
          diff: diffLines.join('\n'),
          linesAdded: newStr ? newStr.split('\n').length : 0,
          linesRemoved: oldStr ? oldStr.split('\n').length : 0,
        };
      }

      if (tool === 'write') {
        const content = raw.input?.content || '';
        return {
          ...base,
          type: 'write' as const,
          file: raw.input?.file_path || 'unknown',
          lineCount: content ? content.split('\n').length : 0,
        };
      }

      if (tool === 'bash') {
        return {
          ...base,
          type: 'bash' as const,
          command: raw.input?.command || 'unknown',
          exitCode: raw.exit_code ?? raw.exitCode ?? 0,
          duration: raw.duration_ms ?? raw.duration ?? 0,
          stdout: raw.stdout || raw.output || '',
          stderr: raw.stderr || '',
        };
      }

      // Generic search
      if (tool === 'search' || tool === 'websearch') {
        return {
          ...base,
          type: 'search' as const,
          query: raw.input?.query || raw.input?.pattern || '',
          results: raw.results_count ?? raw.results?.length ?? 0,
        };
      }

      // Unknown tool — treat as unknown
      return {
        ...base,
        type: 'unknown' as const,
        raw: line,
      };
    }

    // Thinking events
    if (raw.type === 'thinking' || raw.type === 'think') {
      return {
        ...base,
        type: 'think' as const,
        content: raw.content || raw.text || '',
      };
    }

    // Response events
    if (raw.type === 'response' || raw.type === 'text' || raw.type === 'assistant') {
      return {
        ...base,
        type: 'response' as const,
        content: raw.content || raw.text || '',
      };
    }

    // Error events
    if (raw.type === 'error') {
      return {
        ...base,
        type: 'error' as const,
        message: raw.message || raw.error || 'Unknown error',
        stack: raw.stack,
      };
    }

    // Fallback
    return {
      ...base,
      type: 'unknown' as const,
      raw: line,
    };
  } catch {
    // Not valid JSON
    return {
      id: uid(),
      agentId,
      timestamp: Date.now(),
      type: 'unknown',
      expanded: false,
      raw: line,
    };
  }
}

/**
 * Parse an SSE agent_progress event into a LogEvent
 */
export function parseSSEProgress(data: Record<string, unknown>, agentId: string): LogEvent | null {
  const id = uid();
  const timestamp = Date.now();
  const base = { id, agentId, timestamp, expanded: false };
  const content = (data.content || data.text || data.message || '') as string;

  if (!content) return null;

  // Try to detect event type from content
  if (content.startsWith('Error:') || content.startsWith('error:')) {
    return { ...base, type: 'error', message: content };
  }

  // Default to response type
  return { ...base, type: 'response', content };
}

/**
 * Determine which filter categories an event belongs to
 */
export function eventMatchesFilter(event: LogEvent, filter: string): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'edits':
      return event.type === 'edit' || event.type === 'write';
    case 'bash':
      return event.type === 'bash';
    case 'errors':
      return event.type === 'error';
    case 'thinking':
      return event.type === 'think';
    case 'actions':
      return event.type !== 'think' && event.type !== 'unknown';
    default:
      return true;
  }
}
