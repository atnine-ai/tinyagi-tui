import { useEffect, useRef } from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { AppAction, LogEvent } from '../types.js';
import { parseJSONLLine } from '../lib/parseEvent.js';

const LOG_DIR = path.join(os.homedir(), '.tinyagi', 'logs');
const BATCH_INTERVAL = 100; // ms — batch events before dispatching

/**
 * Watch JSONL log files in ~/.tinyagi/logs/ for new events.
 * Uses fs.watch + byte-offset tracking to only read new bytes.
 */
export function useLogWatcher(dispatch: React.Dispatch<AppAction>, mockMode: boolean): void {
  const watchersRef = useRef<Map<string, fs.FSWatcher>>(new Map());
  const offsetsRef = useRef<Map<string, number>>(new Map());
  const batchRef = useRef<Map<string, LogEvent[]>>(new Map());
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mockMode) return;

    // Check if log directory exists
    if (!fs.existsSync(LOG_DIR)) {
      return;
    }

    function flushBatch() {
      const batch = batchRef.current;
      if (batch.size === 0) return;

      for (const [agentId, events] of batch) {
        if (events.length > 0) {
          dispatch({ type: 'ADD_EVENTS_BATCH', agentId, events });
        }
      }
      batchRef.current = new Map();
    }

    function scheduleBatchFlush() {
      if (batchTimerRef.current) return;
      batchTimerRef.current = setTimeout(() => {
        batchTimerRef.current = null;
        flushBatch();
      }, BATCH_INTERVAL);
    }

    function readNewBytes(filePath: string, agentId: string) {
      try {
        const stat = fs.statSync(filePath);
        const currentOffset = offsetsRef.current.get(filePath) || 0;
        if (stat.size <= currentOffset) return;

        const fd = fs.openSync(filePath, 'r');
        const bufSize = stat.size - currentOffset;
        const buf = Buffer.alloc(bufSize);
        fs.readSync(fd, buf, 0, bufSize, currentOffset);
        fs.closeSync(fd);

        offsetsRef.current.set(filePath, stat.size);

        const text = buf.toString('utf-8');
        const lines = text.split('\n').filter((l) => l.trim());

        const events: LogEvent[] = [];
        for (const line of lines) {
          const event = parseJSONLLine(line, agentId);
          if (event) events.push(event);
        }

        if (events.length > 0) {
          const existing = batchRef.current.get(agentId) || [];
          batchRef.current.set(agentId, [...existing, ...events]);
          scheduleBatchFlush();
        }
      } catch {
        // File might be temporarily unavailable
      }
    }

    function watchFile(filePath: string) {
      const basename = path.basename(filePath, '.jsonl');
      // Extract agent ID from filename: agent-{id}.jsonl
      const agentId = basename.replace(/^agent-/, '');

      // Read existing content
      readNewBytes(filePath, agentId);

      try {
        const watcher = fs.watch(filePath, (eventType) => {
          if (eventType === 'change') {
            readNewBytes(filePath, agentId);
          }
        });
        watchersRef.current.set(filePath, watcher);
      } catch {
        // Watch might fail on some platforms
      }
    }

    // Watch for new files in the directory
    try {
      const files = fs.readdirSync(LOG_DIR);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          watchFile(path.join(LOG_DIR, file));
        }
      }

      // Watch directory for new log files
      const dirWatcher = fs.watch(LOG_DIR, (eventType, filename) => {
        if (filename && filename.endsWith('.jsonl') && eventType === 'rename') {
          const filePath = path.join(LOG_DIR, filename);
          if (fs.existsSync(filePath) && !watchersRef.current.has(filePath)) {
            watchFile(filePath);
          }
        }
      });
      watchersRef.current.set(LOG_DIR, dirWatcher);
    } catch {
      // Directory might not exist or be unreadable
    }

    return () => {
      for (const watcher of watchersRef.current.values()) {
        watcher.close();
      }
      watchersRef.current.clear();
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      flushBatch();
    };
  }, [dispatch, mockMode]);
}
