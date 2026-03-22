# TinyAGI TUI

Full-screen terminal dashboard for monitoring and commanding AI agents running in TinyAGI. Real-time activity feeds, task tracking, cost monitoring, agent-to-agent message visibility, and broadcast messaging from a single pane of glass.

## Quick Start

```bash
npm install
npm run mock    # demo mode with simulated agents (no server needed)
npm start       # connects to TinyAGI at localhost:3777
```

## Requirements

- Node.js 18+
- A running TinyAGI instance (for live mode)

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `TINYAGI_API_URL` | `http://localhost:3777` | TinyAGI API endpoint |

```bash
TINYAGI_API_URL=http://remote-host:3777 npm start
```

## Layout

Three-column "Mission Control" layout:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TinyAGI TUI  ▲ 2 active  ● 1 idle   │  CPU: 12%  RAM: 14/16G  18:25 │
├──────────────┬──────────────────────────────────┬──────────────────────┤
│ AGENTS [j/k] │ LIVE FEED — @cto                 │ DETAIL               │
│              │                                   │ Agent: CTO           │
│ ZIGPERPS     │ 14:31  READ  src/routes.ts       │ Branch: feat/api     │
│ ▲ CTO    32s │ 14:31  THINK  Need to refactor...│ Context: 45k/200k    │
│ ● CMO     5m │ 14:31  EDIT   src/routes.ts      │ Cost: $0.08          │
│ ▲ Dev    12s │ 14:32  BASH   npm test  ✓ 3.4s   │                      │
│              │                                   │ Current Task         │
│              │                                   │ Refactor API routes  │
├──────────────┴──────────────────────────────────┴──────────────────────┤
│ > Send to @cto: _                                       [Enter] send  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

Press `?` in the TUI for the full reference.

### Navigation
| Key | Action |
|---|---|
| `j` / `k` | Switch between agents |
| `1`-`9` | Jump to agent by index |
| `/` | Focus input bar |
| `Tab` | Cycle focus (sidebar → feed → input) |
| `f` | Zen mode (fullscreen single agent) |
| `q` | Quit |

### Feed Controls
| Key | Action |
|---|---|
| `G` | Jump to bottom, re-enable auto-scroll |
| `Space` | Pause/resume auto-scroll |
| `e` | Expand/collapse event |
| `p` | Pin/unpin latest event |
| `F1`-`F6` | Filter: all / edits / bash / errors / thinking / actions |

### Views & Overlays
| Key | Action |
|---|---|
| `s` | Activity timeline (all agents) |
| `m` | Agent-to-agent messages |
| `d` | Git diff for selected agent |
| `$` | Cost dashboard |
| `?` | Help overlay |
| `Esc` | Close any overlay |

### Quick Commands
| Key | Sends |
|---|---|
| `Ctrl+1` | "Give me a brief status update on your current work" |
| `Ctrl+2` | "Review your recent changes and run all tests" |
| `Ctrl+3` | "Create a PR for your current branch with a clear description" |
| `Ctrl+4` | "Commit your current work with a descriptive message" |
| `Ctrl+5` | "What blockers or decisions do you need from me?" |

### Broadcast Mode
| Key | Action |
|---|---|
| `Ctrl+B` | Enter broadcast mode |
| `Space` | Toggle agent selection |
| `Ctrl+A` | Select all agents |
| `Esc` | Exit broadcast mode |

## Data Sources

The TUI consumes three parallel data streams:

1. **SSE** (`/api/events/stream`) — real-time agent status transitions
2. **JSONL** (`~/.tinyagi/logs/agent-{id}.jsonl`) — per-agent tool calls, edits, commands
3. **REST polling** — agents (10s), tasks (30s), queue status (5s)

### Graceful Degradation

| Source | If Unavailable |
|---|---|
| JSONL logs | Falls back to SSE `agent_progress` events (less detail) |
| SSE stream | Shows `[DISCONNECTED]`, auto-reconnects every 5s |
| REST API | Cached data continues to display |

## Background Alerts

The TUI automatically watches for:

- **Context > 80%** — agent approaching context window limit
- **Agent stuck** — no events for 5+ minutes while status is active
- **Error spike** — 3+ errors in 10 minutes

Alerts appear as toast notifications with 60-second cooldown per alert.

## TinyAGI Compatibility

The TUI works with stock TinyAGI but with limited functionality. For full capability, apply a small patch (~21 lines across 2 files):

### What works without the patch
- Agent list and team grouping
- Task kanban summary
- Message sending via input bar
- SSE-based status transitions
- Mock mode (all features)

### What requires the patch
- **JSONL live feed** — detailed tool calls, file edits, bash commands in the feed
- **Context/cost display** — per-agent token usage and cost tracking
- **Clean agent context** — removes hidden system prompt injection (~1,200 tokens)
- **Per-agent skills** — stops TinyAGI from overwriting workspace skills

### Applying the patch

See `tinyagi-compatibility-patch.md` for exact diffs. Summary:

| File | Change | Lines |
|---|---|---|
| `packages/core/src/invoke.ts` | Remove `--system-prompt` flag | ~3 lines removed |
| `packages/core/src/invoke.ts` | Add JSONL logging in streaming callback | ~5 lines added |
| `packages/core/src/invoke.ts` | Emit `usage_stats` SSE event | ~5 lines added |
| `packages/core/src/agent.ts` | Remove `syncAgentSkills()` call | ~1 line removed |

After patching: `cd ~/.tinyagi && npm run build`

## Project Structure

```
tinyagi-tui/
├── src/
│   ├── index.tsx              Entry point, CLI args, console redirect
│   ├── app.tsx                Main layout, keyboard routing, state
│   ├── types.ts               All TypeScript interfaces
│   ├── components/
│   │   ├── HeaderBar.tsx      Status summary, system stats, clock
│   │   ├── AgentSidebar.tsx   Agent list with status icons
│   │   ├── LiveFeed.tsx       Scrollable event feed with filtering
│   │   ├── LogEntry.tsx       Per-event formatted rendering
│   │   ├── DetailPanel.tsx    Agent info, tasks, context, cost
│   │   ├── InputBar.tsx       Message input with broadcast support
│   │   ├── Toast.tsx          Notification system
│   │   ├── ZenMode.tsx        Fullscreen single-agent view
│   │   ├── HelpOverlay.tsx    Keyboard shortcut reference
│   │   ├── Timeline.tsx       Cross-agent activity feed
│   │   ├── AgentChat.tsx      Agent-to-agent message view
│   │   ├── DiffModal.tsx      Git diff display
│   │   └── CostDashboard.tsx  Cost aggregation view
│   ├── hooks/
│   │   ├── useAgents.ts       REST polling for agent list
│   │   ├── useTasks.ts        REST polling for tasks
│   │   ├── useSSE.ts          SSE client with auto-reconnect
│   │   ├── useLogWatcher.ts   JSONL file watcher
│   │   ├── useQueueStatus.ts  Queue status polling
│   │   ├── useSystemStats.ts  CPU/RAM monitoring
│   │   ├── useGitBranch.ts    Git branch detection per agent
│   │   ├── useAlerts.ts       Background alert engine
│   │   └── useWindowSize.ts   Terminal dimensions
│   ├── store/
│   │   └── state.ts           Reducer + initial state
│   ├── lib/
│   │   ├── api.ts             REST API client
│   │   ├── parseEvent.ts      JSONL/SSE event parser
│   │   └── format.ts          Formatting utilities
│   └── mock/
│       └── generator.ts       Mock data for demo mode
├── package.json
├── tsconfig.json
├── DECISIONS.md               Architecture decision log
└── README.md
```

## Scripts

| Script | Description |
|---|---|
| `npm start` | Connect to live TinyAGI instance |
| `npm run mock` | Demo mode with simulated agents |
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |

## License

MIT
