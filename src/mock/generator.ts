import type { Agent, Task, LogEvent, AgentStatus } from '../types.js';
import { uid } from '../lib/format.js';

// ─── Mock Agents ───────────────────────────────────────────────────────────────
// Four agents building this very TUI project

const MOCK_AGENTS: Agent[] = [
  {
    id: 'tui-architect',
    name: 'Architect',
    team: 'TINYAGI TUI',
    status: 'active',
    lastHeartbeat: Date.now(),
    sessionStart: Date.now() - 5400_000,
    gitBranch: 'feat/layout-system',
    workingDirectory: '/Users/check-mini-pro/Documents/GitHub/company-a/tinyagi-tui',
    usage: {
      inputTokens: 48000,
      outputTokens: 14000,
      cacheReadTokens: 18000,
      cacheCreationTokens: 5200,
      contextWindow: 200000,
      costUSD: 0.12,
      lastUpdated: Date.now(),
    },
  },
  {
    id: 'tui-frontend',
    name: 'Frontend',
    team: 'TINYAGI TUI',
    status: 'active',
    lastHeartbeat: Date.now(),
    sessionStart: Date.now() - 3600_000,
    gitBranch: 'feat/components',
    workingDirectory: '/Users/check-mini-pro/Documents/GitHub/company-a/tinyagi-tui',
    usage: {
      inputTokens: 72000,
      outputTokens: 17000,
      cacheReadTokens: 32000,
      cacheCreationTokens: 6800,
      contextWindow: 200000,
      costUSD: 0.18,
      lastUpdated: Date.now(),
    },
  },
  {
    id: 'tui-backend',
    name: 'Backend',
    team: 'TINYAGI TUI',
    status: 'idle',
    lastHeartbeat: Date.now() - 180_000,
    sessionStart: Date.now() - 7200_000,
    gitBranch: 'feat/data-layer',
    workingDirectory: '/Users/check-mini-pro/Documents/GitHub/company-a/tinyagi-tui',
    usage: {
      inputTokens: 118000,
      outputTokens: 27000,
      cacheReadTokens: 45000,
      cacheCreationTokens: 9200,
      contextWindow: 200000,
      costUSD: 0.31,
      lastUpdated: Date.now() - 180_000,
    },
  },
  {
    id: 'tui-qa',
    name: 'QA',
    team: 'TINYAGI TUI',
    status: 'error',
    lastHeartbeat: Date.now() - 420_000,
    sessionStart: Date.now() - 9000_000,
    gitBranch: 'test/integration',
    workingDirectory: '/Users/check-mini-pro/Documents/GitHub/company-a/tinyagi-tui',
    usage: {
      inputTokens: 152000,
      outputTokens: 26000,
      cacheReadTokens: 58000,
      cacheCreationTokens: 11400,
      contextWindow: 200000,
      costUSD: 0.42,
      lastUpdated: Date.now() - 420_000,
    },
  },
];

// ─── Mock Tasks ────────────────────────────────────────────────────────────────

const MOCK_TASKS: Task[] = [
  { id: 't1', name: 'Implement three-column layout', status: 'done', agentId: 'tui-architect', completedAt: Date.now() - 3600_000 },
  { id: 't2', name: 'Build LiveFeed with scroll windowing', status: 'in_progress', agentId: 'tui-frontend', startedAt: Date.now() - 1800_000 },
  { id: 't3', name: 'Add SSE reconnection logic', status: 'in_progress', agentId: 'tui-backend', startedAt: Date.now() - 2400_000 },
  { id: 't4', name: 'Write integration tests', status: 'in_progress', agentId: 'tui-qa', startedAt: Date.now() - 1200_000 },
  { id: 't5', name: 'Add keyboard shortcut system', status: 'review', agentId: 'tui-architect', startedAt: Date.now() - 4200_000 },
  { id: 't6', name: 'Implement cost dashboard overlay', status: 'backlog' },
  { id: 't7', name: 'Add broadcast mode', status: 'backlog' },
  { id: 't8', name: 'Fix flickering on rapid events', status: 'backlog' },
];

// ─── Mock Event Templates ──────────────────────────────────────────────────────

// Files scoped per agent role for realistic reads
const ARCHITECT_FILES = [
  'src/app.tsx',
  'src/types.ts',
  'src/store/state.ts',
  'src/store/reducer.ts',
  'src/components/LiveFeed.tsx',
  'src/components/AgentSidebar.tsx',
  'package.json',
];

const FRONTEND_FILES = [
  'src/components/HeaderBar.tsx',
  'src/components/AgentSidebar.tsx',
  'src/components/DetailPanel.tsx',
  'src/components/LogEntry.tsx',
  'src/components/LiveFeed.tsx',
  'src/components/Toast.tsx',
  'src/styles/theme.ts',
];

const BACKEND_FILES = [
  'src/hooks/useSSE.ts',
  'src/lib/api.ts',
  'src/lib/parseEvent.ts',
  'src/hooks/useLogWatcher.ts',
  'src/hooks/useAlerts.ts',
  'src/lib/format.ts',
];

const QA_FILES = [
  'src/components/Toast.tsx',
  'src/components/HelpOverlay.tsx',
  'src/components/LiveFeed.tsx',
  'src/app.tsx',
  'src/mock/generator.ts',
  'src/hooks/useKeyboard.ts',
];

const FILES_BY_AGENT: Record<string, string[]> = {
  'tui-architect': ARCHITECT_FILES,
  'tui-frontend': FRONTEND_FILES,
  'tui-backend': BACKEND_FILES,
  'tui-qa': QA_FILES,
};

const ALL_FILES = [
  ...ARCHITECT_FILES,
  ...FRONTEND_FILES,
  ...BACKEND_FILES,
  ...QA_FILES,
];

// ─── Think Contents ────────────────────────────────────────────────────────────

const THINK_BY_AGENT: Record<string, string[]> = {
  'tui-architect': [
    'The three-column layout should use Ink\'s <Box flexDirection="row"> with flex={1} on the center feed panel. Sidebar gets a fixed width of 28 and detail panel gets 40.',
    'The state reducer is getting complex. I should split AppAction into domain-specific unions — agent actions, event actions, UI actions — and compose them.',
    'Component composition issue: LiveFeed currently owns scroll state, but it should be lifted into the store so DetailPanel can reference the selected event.',
    'Need to think about how pinnedEvents interacts with the scroll windowing. Pinned events should render above the scrollable region in a sticky section.',
    'The useKeyboard hook registers global handlers but doesn\'t clean up on unmount. This will cause duplicate listeners if the app re-renders the root.',
  ],
  'tui-frontend': [
    'The color scheme needs more contrast in the sidebar. Active agents should use green, idle gray, error red — but the Ink <Color> API uses hex strings not named colors.',
    'Text truncation is tricky in the terminal. I can\'t measure pixel width, so I need to count characters and account for wide Unicode glyphs.',
    'The LogEntry component re-renders on every new event because the parent array reference changes. I should use React.memo with a custom comparator on event.id.',
    'Ink doesn\'t support CSS flexbox gap, so I need to add <Box marginRight={1}> spacers between sidebar items manually.',
    'The DetailPanel should show a diff viewer when an edit event is selected. I can split the diff string on newlines and color + lines green, - lines red.',
    'Responsive layout: when terminal width < 100 columns, I should collapse the detail panel and show it as an overlay instead.',
  ],
  'tui-backend': [
    'SSE reconnection needs exponential backoff with jitter. Starting at 1s, doubling to max 30s, with ±500ms random jitter to avoid thundering herd.',
    'The JSONL parser currently reads the entire file on each poll. I should track the byte offset and only read new bytes appended since last check.',
    'Event batching: if 50 events arrive in 100ms, I should batch them into a single ADD_EVENTS_BATCH dispatch instead of 50 individual ADD_EVENT dispatches.',
    'The /api/agents endpoint returns stale data if the agent process crashed. I need a heartbeat timeout — if no heartbeat in 30s, mark agent as stale.',
  ],
  'tui-qa': [
    'The keyboard shortcut "j/k" for scrolling conflicts with text input mode. Need to verify that shortcuts are disabled when the input box is focused.',
    'Found a rendering bug: when the event buffer exceeds 500 items, the scroll offset jumps to 0 on the next event. Likely an off-by-one in the windowing logic.',
    'The Toast component stacks incorrectly when 3+ toasts appear simultaneously. The bottom toast gets clipped by the terminal boundary.',
    'Rate limit hit — Claude API returned 429. Need to wait for the retry-after header value before continuing the test run.',
  ],
};

// ─── Bash Commands ─────────────────────────────────────────────────────────────

const BASH_BY_AGENT: Record<string, Array<{ cmd: string; exit: number; duration: number; stdout: string; stderr?: string }>> = {
  'tui-architect': [
    { cmd: 'npx tsc --noEmit', exit: 0, duration: 4800, stdout: 'No errors found.' },
    { cmd: 'npm run build', exit: 0, duration: 7200, stdout: 'Successfully compiled 24 modules\nOutput: dist/' },
    { cmd: 'npx tsc --noEmit', exit: 1, duration: 3100, stdout: '', stderr: 'src/store/reducer.ts(48,7): error TS2345: Argument of type \'string\' is not assignable to parameter of type \'FocusPanel\'.' },
    { cmd: 'git diff --stat', exit: 0, duration: 85, stdout: ' src/app.tsx          | 42 ++++++++++++------\n src/store/reducer.ts | 18 +++++---\n 2 files changed, 38 insertions(+), 22 deletions(-)' },
  ],
  'tui-frontend': [
    { cmd: 'npm run mock', exit: 0, duration: 1200, stdout: 'Starting mock server on :3777\nGenerating events...' },
    { cmd: 'npx tsc --noEmit', exit: 0, duration: 4500, stdout: 'No errors found.' },
    { cmd: 'npx tsc --noEmit', exit: 1, duration: 3800, stdout: '', stderr: 'src/components/DetailPanel.tsx(31,5): error TS2739: Type \'{ file: string; }\' is missing the following properties from type \'EditEvent\': diff, linesAdded, linesRemoved' },
    { cmd: 'git log --oneline -5', exit: 0, duration: 65, stdout: 'a3f1c2d feat: add LogEntry expand/collapse animation\n8b2e1a0 feat: implement HeaderBar with clock and status\nc91d4f7 fix: sidebar overflow when agent name is long\n2e0f8b3 chore: add Ink box model debug borders\n1a4c6e9 init: scaffold component structure' },
  ],
  'tui-backend': [
    { cmd: 'curl http://localhost:3777/api/agents', exit: 0, duration: 320, stdout: '[{"id":"tui-architect","status":"active"},{"id":"tui-frontend","status":"active"},{"id":"tui-backend","status":"idle"},{"id":"tui-qa","status":"error"}]' },
    { cmd: 'npm test', exit: 0, duration: 6800, stdout: 'PASS src/lib/parseEvent.test.ts\n  parseEvent\n    ✓ parses think event (3ms)\n    ✓ parses edit event with diff (2ms)\n    ✓ handles malformed JSON gracefully (1ms)\n\nTests: 3 passed, 3 total' },
    { cmd: 'npm test', exit: 1, duration: 5200, stdout: '', stderr: 'FAIL src/hooks/useSSE.test.ts\n  SSE reconnection\n    ✕ reconnects with exponential backoff (timeout)\n\nTests: 1 failed, 2 passed, 3 total' },
  ],
  'tui-qa': [
    { cmd: 'npm run mock', exit: 0, duration: 950, stdout: 'Mock mode active. 4 agents simulated.' },
    { cmd: 'npm start', exit: 1, duration: 2100, stdout: '', stderr: 'Error: SIGWINCH handler threw: Cannot read properties of undefined (reading \'columns\')' },
    { cmd: 'npx tsc --noEmit', exit: 0, duration: 4200, stdout: 'No errors found.' },
  ],
};

// ─── Edit Diffs ────────────────────────────────────────────────────────────────

const EDIT_BY_AGENT: Record<string, Array<{ file: string; diff: string; added: number; removed: number }>> = {
  'tui-architect': [
    {
      file: 'src/app.tsx',
      diff: '-  return <Box flexDirection="column">\n-    <HeaderBar />\n-    <LiveFeed />\n-  </Box>\n+  return <Box flexDirection="column" height="100%">\n+    <HeaderBar stats={systemStats} />\n+    <Box flexDirection="row" flexGrow={1}>\n+      <AgentSidebar width={28} />\n+      <LiveFeed flex={1} />\n+      <DetailPanel width={40} />\n+    </Box>\n+  </Box>',
      added: 7,
      removed: 4,
    },
    {
      file: 'src/components/LiveFeed.tsx',
      diff: '-interface LiveFeedProps {}\n+interface LiveFeedProps {\n+  flex?: number;\n+  pinnedEvents?: Set<string>;\n+}',
      added: 3,
      removed: 1,
    },
    {
      file: 'src/store/state.ts',
      diff: '-export const initialState: AppState = {\n-  agents: [],\n-  tasks: [],\n+export const initialState: AppState = {\n+  agents: [],\n+  tasks: [],\n+  pinnedEvents: new Map(),\n+  selectedAgentIds: new Set(),\n+  multiSelectMode: false,',
      added: 5,
      removed: 3,
    },
  ],
  'tui-frontend': [
    {
      file: 'src/components/DetailPanel.tsx',
      diff: '-export function DetailPanel() {\n-  return <Box><Text>Detail</Text></Box>\n+export function DetailPanel({ width }: { width: number }) {\n+  const { selectedEvent, selectedAgent } = useDetailContext();\n+  if (!selectedEvent) return <Box width={width}><Text dimColor>No event selected</Text></Box>;\n+  return (\n+    <Box width={width} flexDirection="column" borderStyle="single">\n+      <Text bold>{selectedEvent.type.toUpperCase()}</Text>\n+      <EventDetail event={selectedEvent} />\n+    </Box>\n+  );',
      added: 7,
      removed: 2,
    },
    {
      file: 'src/components/LogEntry.tsx',
      diff: '-const LogEntry = ({ event }: { event: LogEvent }) => {\n+const LogEntry = React.memo(({ event, isPinned }: { event: LogEvent; isPinned: boolean }) => {\n   const icon = EVENT_ICONS[event.type];\n-  return <Text>{icon} {event.type}</Text>\n+  return (\n+    <Box>\n+      {isPinned && <Text color="yellow">* </Text>}\n+      <Text color={EVENT_COLORS[event.type]}>{icon} {formatSummary(event)}</Text>\n+    </Box>\n+  );',
      added: 6,
      removed: 2,
    },
  ],
  'tui-backend': [
    {
      file: 'src/hooks/useLogWatcher.ts',
      diff: '-  const [offset, setOffset] = useState(0);\n+  const offsetRef = useRef(0);\n+  const batchRef = useRef<LogEvent[]>([]);\n \n-  useEffect(() => {\n-    const interval = setInterval(() => readNewLines(offset), 500);\n+  useEffect(() => {\n+    const interval = setInterval(() => {\n+      const newEvents = readNewLines(offsetRef.current);\n+      if (newEvents.length > 0) {\n+        batchRef.current.push(...newEvents);\n+        offsetRef.current += newEvents.reduce((s, e) => s + JSON.stringify(e).length + 1, 0);\n+      }\n+    }, 200);',
      added: 8,
      removed: 3,
    },
    {
      file: 'src/hooks/useAlerts.ts',
      diff: '-  if (agent.usage && agent.usage.contextWindow > 0) {\n-    const pct = (agent.usage.inputTokens / agent.usage.contextWindow) * 100;\n+  if (agent.usage && agent.usage.contextWindow > 0) {\n+    const totalTokens = agent.usage.inputTokens + agent.usage.cacheReadTokens;\n+    const pct = (totalTokens / agent.usage.contextWindow) * 100;\n+    if (pct >= 90) return { level: \'critical\', message: `Context ${pct.toFixed(0)}% — compact or restart` };\n+    if (pct >= 75) return { level: \'warning\', message: `Context ${pct.toFixed(0)}% — approaching limit` };',
      added: 4,
      removed: 2,
    },
  ],
  'tui-qa': [
    {
      file: 'src/components/Toast.tsx',
      diff: '-  return <Box position="absolute" bottom={0}>\n+  return <Box position="absolute" bottom={0} flexDirection="column-reverse" height={Math.min(toasts.length * 2, 6)}>',
      added: 1,
      removed: 1,
    },
  ],
};

// ─── Responses ─────────────────────────────────────────────────────────────────

const RESPONSES_BY_AGENT: Record<string, string[]> = {
  'tui-architect': [
    'Three-column layout is complete. Sidebar 28 cols, feed flex-1, detail panel 40 cols. All panels respect terminal resize via SIGWINCH.',
    '[@Frontend: The LiveFeed component needs a pinnedEvents prop for the sticky section. I\'ve updated the interface in types.ts.]',
    '[@Backend: Can you expose a /api/agents/:id/events endpoint that supports byte-range queries? The feed needs incremental loading.]',
    'State reducer refactored into composable slices. Each feature (pins, broadcast, cost) is now an independent reducer merged via combineReducers pattern.',
    'Keyboard shortcut system is ready for review. j/k scroll, Tab cycles focus, ? toggles help overlay, z toggles zen mode.',
  ],
  'tui-frontend': [
    'DetailPanel now renders diffs with syntax highlighting. Added lines are green, removed lines are red, context lines are dimmed.',
    '[@Architect: Should the sidebar show context usage as a bar or percentage? I have both implemented, need to pick one.]',
    'LogEntry component optimized with React.memo — re-renders dropped from 50/sec to only when event.id changes. Huge improvement on rapid event streams.',
    'HeaderBar shows the clock, active agent count, and total cost. Updates every second via setInterval.',
    '[@QA: The Toast stacking bug should be fixed now. I changed flexDirection to column-reverse and capped the height at 6 rows.]',
  ],
  'tui-backend': [
    'SSE reconnection implemented with exponential backoff: 1s -> 2s -> 4s -> 8s -> 16s -> 30s cap, with ±500ms jitter.',
    '[@Architect: The /api/agents/:id/events endpoint is live. Supports ?offset=BYTE_OFFSET query param for incremental reads.]',
    'JSONL parser now tracks file byte offset and only reads appended bytes. Memory usage dropped from 12MB to 800KB on a 50k event log.',
    'Event batching is working — dispatches are coalesced into 200ms windows. UI feels much smoother under load.',
  ],
  'tui-qa': [
    'Bug found: pressing "j" in the input box scrolls the feed instead of typing the letter. Keyboard shortcuts must check focus state.',
    '[@Frontend: The Toast stacking is still broken when 4+ toasts appear. The bottom one gets clipped at terminal row 0.]',
    '[@Architect: The help overlay (?) conflicts with the search shortcut (/). Pressing ? while search is open crashes the app.]',
    'Integration test results: 14 passed, 3 failed. Failures are all in keyboard shortcut handling — see test/integration for details.',
  ],
};

// ─── Error Messages ────────────────────────────────────────────────────────────

const ERROR_MESSAGES = [
  'RateLimitError: 429 Too Many Requests — retry after 32s',
  'TypeError: Cannot read properties of undefined (reading \'columns\') at SIGWINCH handler',
  'Error: Event buffer overflow — 1000 events exceeded, oldest 500 dropped',
  'InkError: <Box> with position="absolute" requires explicit width and height',
  'ECONNREFUSED: SSE connection to localhost:3777 refused — is the server running?',
  'RangeError: Maximum call stack size exceeded in reducer (circular dispatch detected)',
];

// ─── Search Queries ────────────────────────────────────────────────────────────

const SEARCH_QUERIES = [
  'flexDirection="row"',
  'useEffect cleanup',
  'pinnedEvents',
  'EventType',
  'SIGWINCH',
  'React.memo',
  'exponential backoff',
  'borderStyle',
  'truncate',
  'AgentStatus',
  'ADD_EVENTS_BATCH',
  'contextWindow',
];

// ─── Generator Functions ───────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockEvent(agentId: string): LogEvent {
  const roll = Math.random();
  const base = { id: uid(), agentId, timestamp: Date.now(), expanded: false };

  const files = FILES_BY_AGENT[agentId] ?? ALL_FILES;
  const thinks = THINK_BY_AGENT[agentId] ?? THINK_BY_AGENT['tui-architect']!;
  const bashes = BASH_BY_AGENT[agentId] ?? BASH_BY_AGENT['tui-architect']!;
  const edits = EDIT_BY_AGENT[agentId] ?? EDIT_BY_AGENT['tui-architect']!;
  const responses = RESPONSES_BY_AGENT[agentId] ?? RESPONSES_BY_AGENT['tui-architect']!;

  if (roll < 0.25) {
    // READ event
    const file = randomItem(files);
    const start = randomInt(1, 120);
    return { ...base, type: 'read', file, lineStart: start, lineEnd: start + randomInt(10, 60) };
  }
  if (roll < 0.45) {
    // THINK event
    return { ...base, type: 'think', content: randomItem(thinks) };
  }
  if (roll < 0.60) {
    // EDIT event
    const edit = randomItem(edits);
    return { ...base, type: 'edit', file: edit.file, diff: edit.diff, linesAdded: edit.added, linesRemoved: edit.removed };
  }
  if (roll < 0.72) {
    // BASH event
    const bash = randomItem(bashes);
    return { ...base, type: 'bash', command: bash.cmd, exitCode: bash.exit, duration: bash.duration, stdout: bash.stdout, stderr: bash.stderr ?? '' };
  }
  if (roll < 0.80) {
    // WRITE event
    const file = randomItem(files);
    return { ...base, type: 'write', file, lineCount: randomInt(20, 200) };
  }
  if (roll < 0.90) {
    // RESPONSE event
    return { ...base, type: 'response', content: randomItem(responses) };
  }
  if (roll < 0.95) {
    // ERROR event
    return { ...base, type: 'error', message: randomItem(ERROR_MESSAGES) };
  }
  // SEARCH event
  return { ...base, type: 'search', query: randomItem(SEARCH_QUERIES), results: randomInt(1, 15) };
}

export function getMockAgents(): Agent[] {
  // Update heartbeats for active agents
  return MOCK_AGENTS.map((a) => ({
    ...a,
    lastHeartbeat: a.status === 'active' ? Date.now() : a.lastHeartbeat,
  }));
}

export function getMockTasks(): Task[] {
  return [...MOCK_TASKS];
}

/**
 * Start generating mock events at random intervals.
 * Only active agents (Architect, Frontend) generate events.
 * Backend is idle. QA is in error state.
 * Returns a cleanup function.
 */
export function startMockEventStream(
  onEvent: (agentId: string, event: LogEvent) => void,
  onAgentStatusChange: (agentId: string, status: AgentStatus) => void,
): () => void {
  let running = true;
  const activeAgents = ['tui-architect', 'tui-frontend'];

  // Generate events for active agents
  function scheduleNext() {
    if (!running) return;
    const delay = randomInt(500, 2500);
    setTimeout(() => {
      if (!running) return;
      const agentId = randomItem(activeAgents);
      const event = generateMockEvent(agentId);
      onEvent(agentId, event);
      scheduleNext();
    }, delay);
  }

  // Simulate heartbeat updates
  const heartbeatInterval = setInterval(() => {
    if (!running) return;
    for (const agent of MOCK_AGENTS) {
      if (agent.status === 'active') {
        onAgentStatusChange(agent.id, 'active');
      }
    }
  }, 5000);

  // Simulate occasional status transitions (but keep Backend idle and QA in error)
  const statusInterval = setInterval(() => {
    if (!running) return;
    if (Math.random() < 0.15) {
      // Only toggle between the two active agents
      const agent = randomItem(MOCK_AGENTS.filter((a) => a.id === 'tui-architect' || a.id === 'tui-frontend'));
      const newStatus: AgentStatus = agent.status === 'active' ? 'idle' : 'active';
      agent.status = newStatus;
      onAgentStatusChange(agent.id, newStatus);
    }
  }, 8000);

  scheduleNext();

  return () => {
    running = false;
    clearInterval(heartbeatInterval);
    clearInterval(statusInterval);
  };
}
