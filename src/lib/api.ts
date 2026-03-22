import type { Agent, Task, QueueAgentStatus } from '../types.js';

const BASE_URL = process.env.TINYAGI_API_URL || 'http://localhost:3777';

/**
 * Fetch list of agents from REST API.
 * TinyAGI returns agents as a keyed object: { alpha: { name, provider, ... }, beta: { ... } }
 */
export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${BASE_URL}/api/agents`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GET /api/agents failed: ${res.status}`);
  const data = await res.json() as Record<string, Record<string, unknown>>;

  // Also fetch teams to map agents to team names
  let teams: Record<string, { name: string; agents: string[]; leader_agent: string }> = {};
  try {
    const teamsRes = await fetch(`${BASE_URL}/api/teams`, { signal: AbortSignal.timeout(3000) });
    if (teamsRes.ok) teams = await teamsRes.json() as typeof teams;
  } catch { /* teams are optional */ }

  // Build agent-to-team lookup
  const agentTeamMap = new Map<string, string>();
  for (const [teamId, team] of Object.entries(teams)) {
    for (const agentId of team.agents || []) {
      agentTeamMap.set(agentId, team.name || teamId);
    }
  }

  return Object.entries(data).map(([id, agent]) => ({
    id,
    name: String(agent.name || id),
    team: agentTeamMap.get(id) || 'default',
    status: 'idle' as Agent['status'],
    lastHeartbeat: Date.now(),
    sessionStart: Date.now(),
    workingDirectory: agent.working_directory ? String(agent.working_directory) : undefined,
  }));
}

/**
 * Fetch tasks from REST API.
 * TinyAGI returns tasks as array with { id, title, status, assignee, assigneeType, ... }
 */
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${BASE_URL}/api/tasks`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GET /api/tasks failed: ${res.status}`);
  const data = await res.json() as Record<string, unknown>[];
  return data.map(mapTask);
}

/**
 * Fetch per-agent queue status.
 * TinyAGI returns: [{ agent, pending, processing }]
 */
export async function fetchQueueStatus(): Promise<QueueAgentStatus[]> {
  const res = await fetch(`${BASE_URL}/api/queue/agents`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GET /api/queue/agents failed: ${res.status}`);
  const data = await res.json() as Record<string, unknown>[];
  return data.map((d) => ({
    agentId: String(d.agent || d.agent_id || d.agentId || ''),
    processing: Number(d.processing || 0) > 0,
    queueLength: Number(d.pending || d.queue_length || 0),
  }));
}

/**
 * Send a message to an agent.
 * TinyAGI expects: { message, agent, channel, sender }
 */
export async function sendMessage(agentId: string, message: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: agentId, message, channel: 'tui', sender: 'Founder' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`POST /api/message failed: ${res.status}`);
}

/**
 * Get the SSE stream URL
 */
export function getSSEUrl(): string {
  return `${BASE_URL}/api/events/stream`;
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapTask(d: Record<string, unknown>): Task {
  return {
    id: String(d.id || d.task_id || ''),
    name: String(d.title || d.name || d.description || 'Untitled'),
    status: mapTaskStatus(d.status),
    agentId: d.assignee ? String(d.assignee) : (d.agent_id ? String(d.agent_id) : undefined),
    startedAt: d.started_at ? new Date(String(d.started_at)).getTime() : (d.createdAt ? Number(d.createdAt) : undefined),
    completedAt: d.completed_at ? new Date(String(d.completed_at)).getTime() : (d.updatedAt && d.status === 'done' ? Number(d.updatedAt) : undefined),
  };
}

function mapTaskStatus(s: unknown): Task['status'] {
  const str = String(s || '').toLowerCase();
  if (str === 'in_progress' || str === 'running' || str === 'active') return 'in_progress';
  if (str === 'review' || str === 'reviewing') return 'review';
  if (str === 'done' || str === 'completed' || str === 'finished') return 'done';
  return 'backlog';
}
