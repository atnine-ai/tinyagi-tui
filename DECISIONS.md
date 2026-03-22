# TinyAGI TUI — Decision Log

## Project Goal
Full-screen terminal dashboard for monitoring AI agents running in TinyAGI. Solo founder with 3+ companies and 3+ agents each needs a single pane of glass to see everything, send messages, and intervene when needed.

## Decision 1: Framework — Ink (React for terminals)

**Chosen**: Ink 6.x with TypeScript
**Why**: React component model makes complex layouts maintainable. Flexbox support via Yoga engine. Active ecosystem (ink-text-input, ink-select-input, ink-spinner). Full-screen mode via alternate screen buffer.
**Rejected**: blessed/blessed-contrib (unmaintained, callback-based), raw ANSI (too low-level), tmux (can't extend).

## Decision 2: Layout — Three-Column "Mission Control"

**Chosen**: Sidebar (agents) + Main Feed (live logs) + Detail Panel (agent info/tasks)
**Why**: Founder needs to glance at sidebar to see which agents are active, focus on one agent's work in the feed, and see task/stats context in the detail panel. This mirrors monitoring dashboards (Grafana, DataDog) that founders already know.

**Additional modes**:
- Zen mode (F key): full-screen single-agent feed for deep focus
- Detail panel hides at terminal width < 140 cols

## Decision 3: Data Sources — SSE + JSONL logs + REST polling

**Chosen**: Three parallel data streams
- **SSE** (`/api/events/stream`): Real-time agent status changes (active/idle), message flow events
- **JSONL logs** (`~/.tinyagi/logs/agent-{id}.jsonl`): Per-agent tool calls, edits, bash commands — the detailed work feed. Read via file watching (chokidar/fs.watch) with byte-offset tracking.
- **REST polling**: Tasks (every 30s), agent list (every 10s), queue status (every 5s)

**Why SSE over polling for status**: SSE gives instant status transitions (agent starts/stops working). Polling would add 1-5s latency to status updates, making the dashboard feel stale.

**Why JSONL over SSE for work feed**: The `agent_progress` SSE event only gives partial text. The JSONL log from `--output-format stream-json` contains the full structured data (tool names, file paths, diffs, command outputs). JSONL is the source of truth for what agents are doing.

**Note**: JSONL logging requires a ~10 line fork change in TinyAGI's invoke.ts. Until that's done, the TUI can fall back to SSE `agent_progress` events for a degraded but functional experience.

## Decision 4: Log Event Formatting

**Chosen**: Parsed and formatted display with collapse rules
- THINK: magenta label, dim text, collapse at 3 lines
- READ: cyan, one-liner (filename + line range)
- EDIT: yellow, show diff with red/green coloring, collapse at 6 lines
- WRITE: yellow bold, one-liner
- BASH: blue, show command + exit code + duration, collapse stdout at 5 lines, never collapse stderr
- ERROR: red bold, never collapse
- RESPONSE: white bold, collapse at 5 lines

**Why collapse**: A founder staring at this for hours needs signal, not noise. An agent reading 10 files in a row is 1 line of signal ("reading project files"), not 10 identical READ events. Expand on demand with 'e' key.

## Decision 5: Features Included in MVP

### Included:
1. **Agent sidebar with status** — see all agents, who's active/idle/error, grouped by team
2. **Live feed** — parsed JSONL events, formatted, auto-scrolling, expandable
3. **Input box** — send messages to selected agent via POST /api/message
4. **Task summary in header** — backlog/in_progress/review/done counts
5. **Detail panel** — current task, recent files, session stats
6. **Heartbeat indicator** — time since last heartbeat per agent
7. **Keyboard navigation** — j/k to switch agents, / to type, Tab to cycle focus
8. **Zen mode** — full-screen single-agent view
9. **Event filters** — F1-F6 to filter by event type
10. **Toast notifications** — agent status changes, errors

### Deferred to v2:
- Dual-agent side-by-side view (Ctrl+D)
- Smart event grouping (edit-test cycles)
- Task board overlay (full kanban)
- Telegram command interface
- Daily digest
- Message history per agent

**Why this cut**: MVP needs to answer two questions: "what are my agents doing right now?" and "can I tell them something?". Everything else is polish.

## Decision 6: Separate Repo

**Chosen**: Standalone package in tinyagi-tui/
**Why**: Zero coupling to TinyAGI internals. Only consumes:
- JSONL files from filesystem
- HTTP API at localhost:3777
- SSE stream at localhost:3777

Can be versioned, published, and used independently. If TinyAGI changes its internals, the TUI doesn't break as long as the API contract holds.

## Decision 7: Scrolling Strategy

**Chosen**: Manual windowing (slice array to visible items)
**Why**: Ink has no native scrolling. `overflow="hidden"` only clips. Must calculate visible window size from terminal height and manually render only visible items. Keep a ring buffer of last 500 events per agent in memory. Load older events on scroll-up.

## Decision 8: Status Detection

**Chosen**: SSE events for real-time + queue API for verification
- `chain_step_start` → agent is active
- `chain_step_done` → agent is idle
- Poll `/api/queue/agents` every 5s as ground truth
- Heartbeat staleness: if last heartbeat > 2x interval → stale (dim gray)

## Decision 9: Mock/Demo Mode

**Chosen**: Build a mock data layer for development and testing
**Why**: Can develop and test the TUI without a running TinyAGI instance. Mock layer generates realistic JSONL events, simulates SSE, and serves fake API responses. Also useful for demos and screenshots.

**For live testing**: Will spin up actual TinyAGI with test agents and verify against real data.

## Decision 10: No Dual-View in MVP

**Chosen**: Defer side-by-side agent comparison
**Why**: Adds significant complexity (two independent scroll states, split focus management, responsive layout changes). The founder can switch between agents with j/k in under 200ms. Dual view is a nice-to-have when two agents collaborate on the same codebase, but not essential for monitoring.

## Decision 11: Color Scheme

**Chosen**: Semantic colors on black background
- Green (#00d787): active/success/added lines
- Yellow (#ffd75f): edits/writes/warnings
- Red (#ff5f5f): errors/removed lines
- Cyan (#5fd7ff): reads/search/info
- Magenta (#af87ff): thinking/internal
- Blue (#5f87ff): bash/commands
- White: responses/labels
- Gray (#6c6c6c): dim/noise/tool results

**Why black background**: Terminal users expect it. Colored backgrounds cause eye strain over hours. Only the selected agent row gets a subtle dark blue highlight.

## Decision 12: Fallback Without JSONL Logs

**Chosen**: Graceful degradation
- If JSONL log directory doesn't exist → use SSE `agent_progress` events only
- If API is unreachable → show error bar, continue showing any cached data
- If no agents configured → show empty state with setup instructions

**Why**: The JSONL logging requires a TinyAGI fork change. The TUI should work (with reduced detail) even before that change is applied.

## Decision 13: API Integration Fixes (Post-Build)

**Fixed during integration testing against live TinyAGI v0.0.15:**

1. **Agent API format**: TinyAGI returns agents as keyed object `{alpha: {...}, beta: {...}}`, not an array. Fixed `fetchAgents()` to destructure `Object.entries()` and extract agent ID from object keys.

2. **Team mapping**: Agents don't have a `team` field in their config. Added a secondary fetch to `GET /api/teams` and built an `agentId → teamName` lookup map.

3. **Send message format**: TinyAGI expects `{agent, message, channel, sender}`, not `{agent_id, message}`. Fixed `sendMessage()`.

4. **Queue status format**: TinyAGI returns `{agent, pending, processing}` per agent. Fixed field name mapping.

5. **Task field names**: TinyAGI uses `title` (not `name`) and `assignee` (not `agent_id`). Fixed `mapTask()`.

**Verified**: All API calls return correct data. Messages sent via TUI format are accepted by TinyAGI queue.

## Decision 14: Context Window Usage Display

**Chosen**: Show per-agent context usage in the Detail Panel with visual progress bar.

**Data source**: Claude CLI's `--output-format stream-json` final `result` event includes `modelUsage` with:
- `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`
- `contextWindow` (total available, e.g., 200000 or 1000000)
- `costUSD` (per-invocation cost)

**Display format** (in Detail Panel):
```
Context
45k / 200k (22%)
██████░░░░░░░░░░░░░░░░░░░░
Cost: $0.0842
```

Bar color changes: green (<50%), yellow (50-80%), red (>80%).
Cost accumulates across invocations within the session.

**TinyAGI fork needed**: ~5 lines in invoke.ts to emit a `usage_stats` SSE event when the `result` JSON is parsed (right where it already logs usage data). Without the fork, the TUI shows usage from mock data only.

**Why**: Context exhaustion is invisible without this. An agent silently degrades as context fills — responses get worse, compaction kicks in, older context is lost. The founder needs to see "this agent is at 85% context" at a glance to know when to reset the session.

## Decision 15: V2 Feature Batch (8 Features)

**Chosen**: Implement 8 new features in a single batch to bring the TUI from "monitoring" to "command center."

### 1. Activity Timeline (`s` key)
Full-screen overlay with reverse-chronological feed of significant events across ALL agents. Filters to only important events: task status changes, agent transitions, RESPONSE events, ERROR events. Scrollable with j/k.
**Why**: Gives a single unified view of what happened across the fleet, without needing to click through each agent.

### 2. Agent-to-Agent Message Feed (`m` key)
Modal overlay showing inter-agent messages extracted from RESPONSE events containing `[@agent:...]` patterns.
**Why**: When agents collaborate (e.g., CTO delegates to Dev), the founder needs to see the conversation without checking each agent individually.

### 3. Diff Summary (`d` key)
Modal showing `git diff` output for the selected agent's workspace, with red/green coloring.
**Why**: Quick sanity check on what an agent has actually changed on disk, without switching to a terminal.

### 4. Quick Commands (`Ctrl+1` through `Ctrl+5`)
Predefined message templates sent instantly: status update, run tests, create PR, commit, blockers.
**Why**: These are the 5 most common founder-to-agent messages. One keypress instead of typing the same thing repeatedly.

### 5. Cost Dashboard (`$` key)
Modal showing per-agent and per-team cost aggregation with context usage percentages.
**Why**: Running 6 agents costs real money. The founder needs to see total session cost at a glance and identify which agents are burning through context.

### 6. Alert Rules (background)
Automatic threshold checks every 5 seconds: context > 80%, agent stuck (no events in 5 min), repeated errors (3+ in 10 min). Generates toast warnings with 60-second cooldown per alert.
**Why**: The founder can't watch all 6 agents simultaneously. Alerts surface problems before they become expensive.

### 7. Pin Events (`p` key)
Mark events as pinned. Pinned events show in a sticky section at the top of the LiveFeed. Persists across agent switching (keyed by agentId).
**Why**: When an agent produces an important result mid-stream, the founder needs to bookmark it before it scrolls away.

### 8. Multi-Select + Broadcast (`Ctrl+B` to enter, `Space` to toggle, `Ctrl+A` for all)
Select multiple agents and send one message to all of them. InputBar changes to "Broadcast to N agents:" prompt. After sending, exits multi-select mode.
**Why**: Common scenario: "everyone commit your work" or "everyone run tests." Broadcasting saves time vs sending the same message 6 times.

**Key bindings summary**: `s` timeline, `m` agent chat, `d` diff, `$` cost, `p` pin, `Ctrl+1-5` quick commands, `Ctrl+B` broadcast, `Space` (in broadcast) toggle select, `Ctrl+A` (in broadcast) select all.

**State additions**: `timelineVisible`, `agentChatVisible`, `diffVisible`, `diffContent`, `costVisible`, `pinnedEvents` (Map<string, Set<string>>), `selectedAgentIds` (Set<string>), `multiSelectMode`.

**New files**: `Timeline.tsx`, `AgentChat.tsx`, `DiffModal.tsx`, `CostDashboard.tsx`, `useAlerts.ts`.
