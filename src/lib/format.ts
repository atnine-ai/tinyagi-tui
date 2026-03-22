/**
 * Format a timestamp in HH:MM:SS format
 */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format a duration in human-readable form (e.g., "32s", "5m", "1h 12m")
 */
export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

/**
 * Format duration in ms for bash output (e.g., "3.4s", "125ms")
 */
export function formatBashDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Time since a timestamp, as short string
 */
export function timeSince(ts: number): string {
  return formatDuration(Date.now() - ts);
}

/**
 * Truncate text to maxLen, adding ellipsis
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Abbreviate a filename path — keep just the last two parts
 */
export function shortPath(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 2) return filePath;
  return parts.slice(-2).join('/');
}

/**
 * Count lines in a string
 */
export function lineCount(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Generate a unique ID
 */
let _idCounter = 0;
export function uid(): string {
  return `evt_${Date.now()}_${++_idCounter}`;
}
