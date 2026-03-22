# TinyAGI Compatibility Patch

Apply these changes to TinyAGI source (`~/.tinyagi/` or wherever installed) to unlock full TUI capability.

**Total: ~21 lines changed across 2 files. Rebuild after: `cd ~/.tinyagi && npm run build`**

---

## Patch 1: Remove `--system-prompt` injection

**File:** `packages/core/src/invoke.ts` (~line 368)

Remove:
```typescript
        if (systemPrompt) {
            claudeArgs.push('--system-prompt', systemPrompt);
        }
```

**Why:** This flag overrides Claude CLI's CLAUDE.md discovery. Removing it lets each agent's workspace CLAUDE.md be the single source of truth for agent context. Saves ~1,200 tokens of hidden template injection.

---

## Patch 2: Add JSONL logging for TUI live feed

**File:** `packages/core/src/invoke.ts`

Add import at top:
```typescript
import { join } from 'path';
import { appendFileSync, mkdirSync } from 'fs';
```

In the streaming callback (inside the `if (onEvent)` block, before the JSON parsing), add JSONL tee:
```typescript
            // Tee to per-agent JSONL log for TUI
            const logDir = join(process.env.TINYAGI_HOME || require('os').homedir() + '/.tinyagi', 'logs');
            mkdirSync(logDir, { recursive: true });
            const logPath = join(logDir, `agent-${agentId}.jsonl`);
```

Then inside the `(line) => {` callback, before `try { const json = JSON.parse(line)`:
```typescript
                appendFileSync(logPath, line + '\n');
```

**Why:** The TUI's LiveFeed reads these files via `fs.watch` to show real-time tool calls, file edits, and bash commands. Without this, the TUI only shows SSE events (much less detail).

---

## Patch 3: Emit usage_stats SSE event

**File:** `packages/core/src/invoke.ts` (~line 386)

Add import at top (if not already):
```typescript
import { emitEvent } from './logging';
```

Change the existing usage logging block from:
```typescript
                        if (json.usage) log('INFO', `Claude usage (${agentId}): ${JSON.stringify(json.usage)}`);
                        if (json.modelUsage) log('INFO', `Claude model usage (${agentId}): ${JSON.stringify(json.modelUsage)}`);
```

To:
```typescript
                        if (json.usage) {
                            log('INFO', `Claude usage (${agentId}): ${JSON.stringify(json.usage)}`);
                        }
                        if (json.modelUsage) {
                            log('INFO', `Claude model usage (${agentId}): ${JSON.stringify(json.modelUsage)}`);
                            emitEvent('usage_stats', { agentId, modelUsage: json.modelUsage });
                        }
```

**Why:** The TUI displays per-agent context window usage (e.g., "45k / 200k (22%)") and cost. The `modelUsage` object from Claude CLI contains `contextWindow`, `inputTokens`, `outputTokens`, `costUSD` — everything the TUI needs.

---

## Patch 4: Remove skill symlink recreation

**File:** `packages/core/src/agent.ts` (~line 119)

Remove or comment out:
```typescript
    // Always sync skills (keeps them up to date for both new and existing dirs)
    syncAgentSkills(agentDir);
```

**Why:** `syncAgentSkills()` forcibly deletes `.claude/skills/` and recreates a symlink to the full default skill set on every agent invocation. This overwrites workspace-level skills that are intentionally curated per agent (e.g., smart contract dev doesn't need the image generation skill).

---

## After Patching

```bash
cd ~/.tinyagi
npm run build
tinyagi restart
```

## Verification

1. Send a message to an agent: `curl -X POST localhost:3777/api/message -H 'Content-Type: application/json' -d '{"agent":"your-agent","message":"hello","channel":"test","sender":"Founder"}'`
2. Check JSONL log exists: `ls ~/.tinyagi/logs/agent-*.jsonl`
3. Check SSE events: `curl -N localhost:3777/api/events/stream` — look for `usage_stats` events after agent responds
4. Start TUI: `npm start` — LiveFeed should show real tool calls, Detail Panel should show context usage
