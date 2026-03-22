// ─── Agent Types ───────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'error' | 'stale';

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  contextWindow: number;       // total available (e.g., 200000 or 1000000)
  costUSD: number;             // cumulative cost this session
  lastUpdated: number;         // timestamp ms
}

export interface Agent {
  id: string;
  name: string;
  team: string;
  status: AgentStatus;
  lastHeartbeat: number; // timestamp ms
  currentTaskId?: string;
  sessionStart: number; // timestamp ms
  usage?: AgentUsage;
  gitBranch?: string;
  workingDirectory?: string;
}

// ─── System Stats ───────────────────────────────────────────────────────────────

export interface SystemStats {
  cpuUsage: number;      // percentage 0-100
  memUsed: number;       // bytes
  memTotal: number;      // bytes
  loadAvg: number;       // 1-minute load average
}

// ─── Task Types ────────────────────────────────────────────────────────────────

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  agentId?: string;
  startedAt?: number;
  completedAt?: number;
}

// ─── Log Event Types ───────────────────────────────────────────────────────────

export type EventType = 'think' | 'read' | 'edit' | 'write' | 'bash' | 'error' | 'response' | 'search' | 'unknown';

export interface BaseLogEvent {
  id: string;
  agentId: string;
  timestamp: number;
  type: EventType;
  expanded: boolean;
}

export interface ThinkEvent extends BaseLogEvent {
  type: 'think';
  content: string;
}

export interface ReadEvent extends BaseLogEvent {
  type: 'read';
  file: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface EditEvent extends BaseLogEvent {
  type: 'edit';
  file: string;
  diff: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface WriteEvent extends BaseLogEvent {
  type: 'write';
  file: string;
  lineCount: number;
}

export interface BashEvent extends BaseLogEvent {
  type: 'bash';
  command: string;
  exitCode: number;
  duration: number; // ms
  stdout: string;
  stderr: string;
}

export interface ErrorEvent extends BaseLogEvent {
  type: 'error';
  message: string;
  stack?: string;
}

export interface ResponseEvent extends BaseLogEvent {
  type: 'response';
  content: string;
}

export interface SearchEvent extends BaseLogEvent {
  type: 'search';
  query: string;
  results: number;
}

export interface UnknownEvent extends BaseLogEvent {
  type: 'unknown';
  raw: string;
}

export type LogEvent =
  | ThinkEvent
  | ReadEvent
  | EditEvent
  | WriteEvent
  | BashEvent
  | ErrorEvent
  | ResponseEvent
  | SearchEvent
  | UnknownEvent;

// ─── Filter Types ──────────────────────────────────────────────────────────────

export type FilterMode = 'all' | 'edits' | 'bash' | 'errors' | 'thinking' | 'actions';

// ─── Toast Types ───────────────────────────────────────────────────────────────

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  level: ToastLevel;
  createdAt: number;
}

// ─── State Types ───────────────────────────────────────────────────────────────

export type FocusPanel = 'sidebar' | 'feed' | 'input';

export interface AppState {
  agents: Agent[];
  tasks: Task[];
  eventBuffers: Map<string, LogEvent[]>;
  selectedAgentId: string | null;
  scrollOffsets: Map<string, number>;
  autoScroll: Map<string, boolean>;
  filterMode: FilterMode;
  zenMode: boolean;
  focusPanel: FocusPanel;
  toasts: Toast[];
  inputValue: string;
  connected: boolean;
  mockMode: boolean;
  helpVisible: boolean;
  systemStats: SystemStats | null;
  // Feature 1: Activity Timeline
  timelineVisible: boolean;
  // Feature 2: Agent-to-Agent Chat
  agentChatVisible: boolean;
  // Feature 3: Diff Summary
  diffVisible: boolean;
  diffContent: string;
  // Feature 5: Cost Dashboard
  costVisible: boolean;
  // Feature 7: Pin Events
  pinnedEvents: Map<string, Set<string>>;
  // Feature 8: Multi-Select + Broadcast
  selectedAgentIds: Set<string>;
  multiSelectMode: boolean;
}

// ─── Action Types ──────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_AGENTS'; agents: Agent[] }
  | { type: 'UPDATE_AGENT'; agentId: string; updates: Partial<Agent> }
  | { type: 'UPDATE_USAGE'; agentId: string; usage: AgentUsage }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'ADD_EVENT'; agentId: string; event: LogEvent }
  | { type: 'ADD_EVENTS_BATCH'; agentId: string; events: LogEvent[] }
  | { type: 'TOGGLE_EVENT_EXPAND'; agentId: string; eventId: string }
  | { type: 'SELECT_AGENT'; agentId: string }
  | { type: 'SELECT_AGENT_BY_INDEX'; index: number }
  | { type: 'SELECT_NEXT_AGENT' }
  | { type: 'SELECT_PREV_AGENT' }
  | { type: 'SET_SCROLL_OFFSET'; agentId: string; offset: number }
  | { type: 'SET_AUTO_SCROLL'; agentId: string; enabled: boolean }
  | { type: 'SET_FILTER'; mode: FilterMode }
  | { type: 'TOGGLE_ZEN_MODE' }
  | { type: 'SET_FOCUS'; panel: FocusPanel }
  | { type: 'CYCLE_FOCUS' }
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; toastId: string }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SET_SYSTEM_STATS'; stats: SystemStats }
  // Feature 1: Activity Timeline
  | { type: 'TOGGLE_TIMELINE' }
  // Feature 2: Agent-to-Agent Chat
  | { type: 'TOGGLE_AGENT_CHAT' }
  // Feature 3: Diff Summary
  | { type: 'SHOW_DIFF'; content: string }
  | { type: 'HIDE_DIFF' }
  // Feature 5: Cost Dashboard
  | { type: 'TOGGLE_COST' }
  // Feature 7: Pin Events
  | { type: 'TOGGLE_PIN'; agentId: string; eventId: string }
  // Feature 8: Multi-Select + Broadcast
  | { type: 'TOGGLE_MULTI_SELECT' }
  | { type: 'TOGGLE_AGENT_SELECTION'; agentId: string }
  | { type: 'SELECT_ALL_AGENTS' }
  | { type: 'CLEAR_SELECTION' };

// ─── SSE Event Types ───────────────────────────────────────────────────────────

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

// ─── Queue Status ──────────────────────────────────────────────────────────────

export interface QueueAgentStatus {
  agentId: string;
  processing: boolean;
  queueLength: number;
}
