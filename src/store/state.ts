import type { AppState, AppAction, LogEvent } from '../types.js';

const MAX_EVENTS_PER_AGENT = 500;

export const initialState: AppState = {
  agents: [],
  tasks: [],
  eventBuffers: new Map(),
  selectedAgentId: null,
  scrollOffsets: new Map(),
  autoScroll: new Map(),
  filterMode: 'all',
  zenMode: false,
  focusPanel: 'sidebar',
  toasts: [],
  inputValue: '',
  connected: false,
  mockMode: false,
  helpVisible: false,
  systemStats: null,
  // Feature 1: Activity Timeline
  timelineVisible: false,
  // Feature 2: Agent-to-Agent Chat
  agentChatVisible: false,
  // Feature 3: Diff Summary
  diffVisible: false,
  diffContent: '',
  // Feature 5: Cost Dashboard
  costVisible: false,
  // Feature 7: Pin Events
  pinnedEvents: new Map(),
  // Feature 8: Multi-Select + Broadcast
  selectedAgentIds: new Set(),
  multiSelectMode: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AGENTS': {
      const newState = { ...state, agents: action.agents };
      // If no agent selected and we have agents, select first
      if (!newState.selectedAgentId && action.agents.length > 0) {
        newState.selectedAgentId = action.agents[0]!.id;
      }
      return newState;
    }

    case 'UPDATE_AGENT': {
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, ...action.updates } : a
        ),
      };
    }

    case 'UPDATE_USAGE': {
      return {
        ...state,
        agents: state.agents.map((a) => {
          if (a.id !== action.agentId) return a;
          // Accumulate cost across invocations
          const prevCost = a.usage?.costUSD || 0;
          return { ...a, usage: { ...action.usage, costUSD: prevCost + action.usage.costUSD } };
        }),
      };
    }

    case 'SET_TASKS':
      return { ...state, tasks: action.tasks };

    case 'ADD_EVENT': {
      const buffers = new Map(state.eventBuffers);
      const existing = buffers.get(action.agentId) || [];
      const updated = [...existing, action.event];
      // Ring buffer: keep only last MAX_EVENTS_PER_AGENT
      if (updated.length > MAX_EVENTS_PER_AGENT) {
        buffers.set(action.agentId, updated.slice(updated.length - MAX_EVENTS_PER_AGENT));
      } else {
        buffers.set(action.agentId, updated);
      }
      return { ...state, eventBuffers: buffers };
    }

    case 'ADD_EVENTS_BATCH': {
      const buffers = new Map(state.eventBuffers);
      const existing = buffers.get(action.agentId) || [];
      const updated = [...existing, ...action.events];
      if (updated.length > MAX_EVENTS_PER_AGENT) {
        buffers.set(action.agentId, updated.slice(updated.length - MAX_EVENTS_PER_AGENT));
      } else {
        buffers.set(action.agentId, updated);
      }
      return { ...state, eventBuffers: buffers };
    }

    case 'TOGGLE_EVENT_EXPAND': {
      const buffers = new Map(state.eventBuffers);
      const events = buffers.get(action.agentId);
      if (events) {
        buffers.set(
          action.agentId,
          events.map((e) =>
            e.id === action.eventId ? { ...e, expanded: !e.expanded } : e
          )
        );
      }
      return { ...state, eventBuffers: buffers };
    }

    case 'SELECT_AGENT': {
      return { ...state, selectedAgentId: action.agentId };
    }

    case 'SELECT_AGENT_BY_INDEX': {
      if (action.index >= 0 && action.index < state.agents.length) {
        return { ...state, selectedAgentId: state.agents[action.index]!.id };
      }
      return state;
    }

    case 'SELECT_NEXT_AGENT': {
      if (state.agents.length === 0) return state;
      const idx = state.agents.findIndex((a) => a.id === state.selectedAgentId);
      const next = (idx + 1) % state.agents.length;
      return { ...state, selectedAgentId: state.agents[next]!.id };
    }

    case 'SELECT_PREV_AGENT': {
      if (state.agents.length === 0) return state;
      const idx = state.agents.findIndex((a) => a.id === state.selectedAgentId);
      const prev = idx <= 0 ? state.agents.length - 1 : idx - 1;
      return { ...state, selectedAgentId: state.agents[prev]!.id };
    }

    case 'SET_SCROLL_OFFSET': {
      const offsets = new Map(state.scrollOffsets);
      offsets.set(action.agentId, action.offset);
      return { ...state, scrollOffsets: offsets };
    }

    case 'SET_AUTO_SCROLL': {
      const autoScroll = new Map(state.autoScroll);
      autoScroll.set(action.agentId, action.enabled);
      return { ...state, autoScroll: autoScroll };
    }

    case 'SET_FILTER':
      return { ...state, filterMode: action.mode };

    case 'TOGGLE_ZEN_MODE':
      return { ...state, zenMode: !state.zenMode };

    case 'SET_FOCUS':
      return { ...state, focusPanel: action.panel };

    case 'CYCLE_FOCUS': {
      const panels: AppState['focusPanel'][] = ['sidebar', 'feed', 'input'];
      const idx = panels.indexOf(state.focusPanel);
      const next = (idx + 1) % panels.length;
      return { ...state, focusPanel: panels[next]! };
    }

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };

    case 'SET_INPUT':
      return { ...state, inputValue: action.value };

    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };

    case 'TOGGLE_HELP':
      return { ...state, helpVisible: !state.helpVisible };

    case 'SET_SYSTEM_STATS':
      return { ...state, systemStats: action.stats };

    // Feature 1: Activity Timeline
    case 'TOGGLE_TIMELINE':
      return { ...state, timelineVisible: !state.timelineVisible };

    // Feature 2: Agent-to-Agent Chat
    case 'TOGGLE_AGENT_CHAT':
      return { ...state, agentChatVisible: !state.agentChatVisible };

    // Feature 3: Diff Summary
    case 'SHOW_DIFF':
      return { ...state, diffVisible: true, diffContent: action.content };

    case 'HIDE_DIFF':
      return { ...state, diffVisible: false, diffContent: '' };

    // Feature 5: Cost Dashboard
    case 'TOGGLE_COST':
      return { ...state, costVisible: !state.costVisible };

    // Feature 7: Pin Events
    case 'TOGGLE_PIN': {
      const pinned = new Map(state.pinnedEvents);
      const agentPins = new Set(pinned.get(action.agentId) || []);
      if (agentPins.has(action.eventId)) {
        agentPins.delete(action.eventId);
      } else {
        agentPins.add(action.eventId);
      }
      pinned.set(action.agentId, agentPins);
      return { ...state, pinnedEvents: pinned };
    }

    // Feature 8: Multi-Select + Broadcast
    case 'TOGGLE_MULTI_SELECT':
      return {
        ...state,
        multiSelectMode: !state.multiSelectMode,
        selectedAgentIds: state.multiSelectMode ? new Set<string>() : new Set<string>(),
      };

    case 'TOGGLE_AGENT_SELECTION': {
      const selected = new Set(state.selectedAgentIds);
      if (selected.has(action.agentId)) {
        selected.delete(action.agentId);
      } else {
        selected.add(action.agentId);
      }
      return { ...state, selectedAgentIds: selected };
    }

    case 'SELECT_ALL_AGENTS': {
      const allIds = new Set(state.agents.map((a) => a.id));
      return { ...state, selectedAgentIds: allIds };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedAgentIds: new Set<string>(), multiSelectMode: false };

    default:
      return state;
  }
}
