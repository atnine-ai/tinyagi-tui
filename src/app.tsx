import React, { useReducer, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { execSync } from 'node:child_process';
import type { FilterMode } from './types.js';
import { appReducer, initialState } from './store/state.js';
import { useWindowSize } from './hooks/useWindowSize.js';
import { useAgents } from './hooks/useAgents.js';
import { useTasks } from './hooks/useTasks.js';
import { useSSE } from './hooks/useSSE.js';
import { useLogWatcher } from './hooks/useLogWatcher.js';
import { useQueueStatus } from './hooks/useQueueStatus.js';
import { useSystemStats } from './hooks/useSystemStats.js';
import { useGitBranch } from './hooks/useGitBranch.js';
import { useAlerts } from './hooks/useAlerts.js';
import { sendMessage } from './lib/api.js';
import { uid } from './lib/format.js';
import { startMockEventStream } from './mock/generator.js';
import { HeaderBar } from './components/HeaderBar.js';
import { AgentSidebar } from './components/AgentSidebar.js';
import { LiveFeed } from './components/LiveFeed.js';
import { DetailPanel } from './components/DetailPanel.js';
import { InputBar } from './components/InputBar.js';
import { ToastContainer } from './components/Toast.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ZenMode } from './components/ZenMode.js';
import { Timeline } from './components/Timeline.js';
import { AgentChat } from './components/AgentChat.js';
import { DiffModal } from './components/DiffModal.js';
import { CostDashboard } from './components/CostDashboard.js';

// ─── Feature 4: Quick Commands ────────────────────────────────────────────────

const QUICK_COMMANDS: string[] = [
  'Give me a brief status update on your current work',
  'Review your recent changes and run all tests',
  'Create a PR for your current branch with a clear description',
  'Commit your current work with a descriptive message',
  'What blockers or decisions do you need from me?',
];

interface AppProps {
  mockMode: boolean;
}

export function App({ mockMode }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    mockMode,
  });

  // ─── Clock ticker for header ───────────────────────────────────────────────
  const [, setTick] = React.useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  // ─── Data hooks ────────────────────────────────────────────────────────────
  useAgents(dispatch, mockMode);
  useTasks(dispatch, mockMode);
  useSSE(dispatch, mockMode);
  useLogWatcher(dispatch, mockMode);
  useQueueStatus(dispatch, mockMode);
  useSystemStats(dispatch);
  useGitBranch(dispatch, state.agents, mockMode);

  // Feature 6: Alert Rules
  useAlerts(dispatch, state.agents, state.eventBuffers);

  // ─── Mock event stream ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mockMode) return;

    const cleanup = startMockEventStream(
      (agentId, event) => {
        dispatch({ type: 'ADD_EVENT', agentId, event });
      },
      (agentId, status) => {
        dispatch({
          type: 'UPDATE_AGENT',
          agentId,
          updates: { status, lastHeartbeat: Date.now() },
        });
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: `${agentId} \u2192 ${status}`,
            level: status === 'error' ? 'error' : status === 'active' ? 'info' : 'success',
            createdAt: Date.now(),
          },
        });
      }
    );

    return cleanup;
  }, [mockMode]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const selectedAgent = useMemo(
    () => state.agents.find((a) => a.id === state.selectedAgentId) ?? null,
    [state.agents, state.selectedAgentId]
  );

  const selectedEvents = useMemo(
    () => (state.selectedAgentId ? state.eventBuffers.get(state.selectedAgentId) || [] : []),
    [state.eventBuffers, state.selectedAgentId]
  );

  const scrollOffset = useMemo(
    () => (state.selectedAgentId ? state.scrollOffsets.get(state.selectedAgentId) ?? -1 : -1),
    [state.scrollOffsets, state.selectedAgentId]
  );

  const autoScrollEnabled = useMemo(
    () => (state.selectedAgentId ? state.autoScroll.get(state.selectedAgentId) ?? true : true),
    [state.autoScroll, state.selectedAgentId]
  );

  const pinnedEventIds = useMemo(
    () => (state.selectedAgentId ? state.pinnedEvents.get(state.selectedAgentId) || new Set<string>() : new Set<string>()),
    [state.pinnedEvents, state.selectedAgentId]
  );

  const broadcastCount = useMemo(
    () => state.multiSelectMode ? state.selectedAgentIds.size : 0,
    [state.multiSelectMode, state.selectedAgentIds]
  );

  const showDetailPanel = columns >= 140 && !state.zenMode;
  const compactNames = columns < 100;

  // ─── Layout calculations ───────────────────────────────────────────────────
  const headerHeight = 2;
  const inputLineCount = Math.min((state.inputValue.split('\n').length), 5);
  const inputHeight = inputLineCount + 1; // lines + separator
  const sidebarWidth = 24;
  const detailWidth = showDetailPanel ? 32 : 0;
  const feedWidth = Math.max(columns - sidebarWidth - detailWidth - (state.zenMode ? 0 : 2), 30);
  const bodyHeight = Math.max(rows - headerHeight - inputHeight, 10);

  // ─── Helper: send a quick command ──────────────────────────────────────────
  const sendQuickCommand = useCallback(async (commandIndex: number) => {
    const command = QUICK_COMMANDS[commandIndex];
    if (!command) return;

    if (state.multiSelectMode && state.selectedAgentIds.size > 0) {
      // Broadcast to selected agents
      for (const agentId of state.selectedAgentIds) {
        try {
          if (!mockMode) {
            await sendMessage(agentId, command);
          }
        } catch {
          // ignore individual failures
        }
      }
      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: uid(),
          message: `Quick command sent to ${state.selectedAgentIds.size} agents`,
          level: 'success',
          createdAt: Date.now(),
        },
      });
    } else if (state.selectedAgentId) {
      try {
        if (!mockMode) {
          await sendMessage(state.selectedAgentId, command);
        }
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: `Quick cmd #${commandIndex + 1} sent to @${selectedAgent?.name || state.selectedAgentId}`,
            level: 'success',
            createdAt: Date.now(),
          },
        });
      } catch {
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: 'Failed to send quick command',
            level: 'error',
            createdAt: Date.now(),
          },
        });
      }
    }
  }, [state.selectedAgentId, selectedAgent, mockMode, state.multiSelectMode, state.selectedAgentIds]);

  // ─── Helper: run git diff ────────────────────────────────────────────────────
  const runGitDiff = useCallback(() => {
    if (!selectedAgent) {
      dispatch({ type: 'SHOW_DIFF', content: 'No agent selected' });
      return;
    }
    if (!selectedAgent.workingDirectory) {
      dispatch({ type: 'SHOW_DIFF', content: 'No git repo — agent has no working directory' });
      return;
    }
    try {
      const output = execSync('git diff', {
        cwd: selectedAgent.workingDirectory,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      dispatch({ type: 'SHOW_DIFF', content: output || '' });
    } catch {
      dispatch({ type: 'SHOW_DIFF', content: 'No git repo or git diff failed' });
    }
  }, [selectedAgent]);

  // ─── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', value });
  }, []);

  const handleInputSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    // Feature 8: Broadcast mode
    if (state.multiSelectMode && state.selectedAgentIds.size > 0) {
      for (const agentId of state.selectedAgentIds) {
        try {
          if (!mockMode) {
            await sendMessage(agentId, value.trim());
          }
        } catch {
          // ignore individual failures in broadcast
        }
      }
      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: uid(),
          message: `Broadcast sent to ${state.selectedAgentIds.size} agents`,
          level: 'success',
          createdAt: Date.now(),
        },
      });
      dispatch({ type: 'CLEAR_SELECTION' });
      dispatch({ type: 'SET_INPUT', value: '' });
      return;
    }

    if (!state.selectedAgentId) return;

    try {
      if (!mockMode) {
        await sendMessage(state.selectedAgentId, value.trim());
      }
      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: uid(),
          message: `Message sent to @${selectedAgent?.name || state.selectedAgentId}`,
          level: 'success',
          createdAt: Date.now(),
        },
      });
    } catch {
      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: uid(),
          message: 'Failed to send message',
          level: 'error',
          createdAt: Date.now(),
        },
      });
    }

    dispatch({ type: 'SET_INPUT', value: '' });
  }, [state.selectedAgentId, selectedAgent, mockMode, state.multiSelectMode, state.selectedAgentIds]);

  const handleToastDismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', toastId: id });
  }, []);

  // ─── Overlay close handlers ────────────────────────────────────────────────
  const handleTimelineClose = useCallback(() => {
    dispatch({ type: 'TOGGLE_TIMELINE' });
  }, []);

  const handleAgentChatClose = useCallback(() => {
    dispatch({ type: 'TOGGLE_AGENT_CHAT' });
  }, []);

  const handleDiffClose = useCallback(() => {
    dispatch({ type: 'HIDE_DIFF' });
  }, []);

  const handleCostClose = useCallback(() => {
    dispatch({ type: 'TOGGLE_COST' });
  }, []);

  // ─── Check if any overlay is open ──────────────────────────────────────────
  const anyOverlayOpen = state.helpVisible || state.timelineVisible || state.agentChatVisible || state.diffVisible || state.costVisible;

  // ─── Keyboard handling ─────────────────────────────────────────────────────
  useInput((input, key) => {
    // Modal overlays handle their own input (Esc, j/k scrolling, etc.)
    if (anyOverlayOpen) {
      return;
    }

    // Input mode — only Escape exits
    if (state.focusPanel === 'input') {
      if (key.escape) {
        if (state.multiSelectMode) {
          dispatch({ type: 'CLEAR_SELECTION' });
        }
        dispatch({ type: 'SET_FOCUS', panel: 'sidebar' });
      }
      // Let TextInput handle everything else
      return;
    }

    // Global shortcuts
    if (input === 'q') {
      exit();
      return;
    }

    if (input === '?') {
      dispatch({ type: 'TOGGLE_HELP' });
      return;
    }

    if (input === '/') {
      dispatch({ type: 'SET_FOCUS', panel: 'input' });
      return;
    }

    if (key.tab) {
      dispatch({ type: 'CYCLE_FOCUS' });
      return;
    }

    if (input === 'f') {
      dispatch({ type: 'TOGGLE_ZEN_MODE' });
      return;
    }

    // Feature 1: Activity Timeline toggle
    if (input === 's') {
      dispatch({ type: 'TOGGLE_TIMELINE' });
      return;
    }

    // Feature 2: Agent-to-Agent Chat toggle
    if (input === 'm') {
      dispatch({ type: 'TOGGLE_AGENT_CHAT' });
      return;
    }

    // Feature 3: Diff Summary
    if (input === 'd') {
      runGitDiff();
      return;
    }

    // Feature 5: Cost Dashboard toggle
    if (input === '$') {
      dispatch({ type: 'TOGGLE_COST' });
      return;
    }

    // Feature 7: Pin Events
    if (input === 'p') {
      if (state.selectedAgentId && selectedEvents.length > 0) {
        const lastEvent = selectedEvents[selectedEvents.length - 1]!;
        dispatch({ type: 'TOGGLE_PIN', agentId: state.selectedAgentId, eventId: lastEvent.id });
        const isPinned = pinnedEventIds.has(lastEvent.id);
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: isPinned ? 'Event unpinned' : 'Event pinned',
            level: 'info',
            createdAt: Date.now(),
          },
        });
      }
      return;
    }

    if (key.escape) {
      if (state.multiSelectMode) {
        dispatch({ type: 'CLEAR_SELECTION' });
        return;
      }
      if (state.zenMode) {
        dispatch({ type: 'TOGGLE_ZEN_MODE' });
      } else {
        dispatch({ type: 'SET_FOCUS', panel: 'sidebar' });
      }
      return;
    }

    // Feature 8: Multi-select mode — Space toggles agent selection
    if (state.multiSelectMode && input === ' ') {
      if (state.selectedAgentId) {
        dispatch({ type: 'TOGGLE_AGENT_SELECTION', agentId: state.selectedAgentId });
      }
      return;
    }

    // Agent navigation
    if (input === 'j' || key.downArrow) {
      dispatch({ type: 'SELECT_NEXT_AGENT' });
      return;
    }
    if (input === 'k' || key.upArrow) {
      dispatch({ type: 'SELECT_PREV_AGENT' });
      return;
    }

    // Number keys for agent selection (only when Ctrl is NOT held)
    if (!key.ctrl) {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= 9) {
        dispatch({ type: 'SELECT_AGENT_BY_INDEX', index: num - 1 });
        return;
      }
    }

    // Scroll controls (only when not in multi-select mode)
    if (!state.multiSelectMode) {
      if (input === 'G') {
        if (state.selectedAgentId) {
          dispatch({ type: 'SET_AUTO_SCROLL', agentId: state.selectedAgentId, enabled: true });
        }
        return;
      }

      if (input === ' ') {
        if (state.selectedAgentId) {
          dispatch({
            type: 'SET_AUTO_SCROLL',
            agentId: state.selectedAgentId,
            enabled: !autoScrollEnabled,
          });
        }
        return;
      }
    }

    // Expand/collapse
    if (input === 'e') {
      if (state.selectedAgentId && selectedEvents.length > 0) {
        const lastEvent = selectedEvents[selectedEvents.length - 1]!;
        dispatch({ type: 'TOGGLE_EVENT_EXPAND', agentId: state.selectedAgentId, eventId: lastEvent.id });
      }
      return;
    }

    // Ctrl+ key combos
    if (key.ctrl) {
      // Feature 8: Ctrl+B — enter broadcast/multi-select mode
      if (input === 'b') {
        dispatch({ type: 'TOGGLE_MULTI_SELECT' });
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: state.multiSelectMode ? 'Broadcast mode off' : 'Broadcast mode on — Space to select, Ctrl+A for all',
            level: 'info',
            createdAt: Date.now(),
          },
        });
        return;
      }

      // Feature 8: Ctrl+A — select all agents (in multi-select mode)
      if (input === 'a' && state.multiSelectMode) {
        dispatch({ type: 'SELECT_ALL_AGENTS' });
        dispatch({
          type: 'ADD_TOAST',
          toast: {
            id: uid(),
            message: `All ${state.agents.length} agents selected`,
            level: 'info',
            createdAt: Date.now(),
          },
        });
        return;
      }

      // Feature 4: Quick Commands (Ctrl+1 through Ctrl+5)
      const qcIndex = parseInt(input, 10);
      if (qcIndex >= 1 && qcIndex <= 5) {
        void sendQuickCommand(qcIndex - 1);
        return;
      }
    }
  });

  // Handle raw stdin for F-keys and Ctrl+number quick commands
  useEffect(() => {
    function handleData(data: Buffer) {
      const str = data.toString();
      // F1=\x1bOP, F2=\x1bOQ, F3=\x1bOR, F4=\x1bOS
      // F5=\x1b[15~, F6=\x1b[17~
      const fKeyMap: Record<string, FilterMode> = {
        '\x1bOP': 'all',
        '\x1b[11~': 'all',
        '\x1bOQ': 'edits',
        '\x1b[12~': 'edits',
        '\x1bOR': 'bash',
        '\x1b[13~': 'bash',
        '\x1bOS': 'errors',
        '\x1b[14~': 'errors',
        '\x1b[15~': 'thinking',
        '\x1b[17~': 'actions',
      };
      if (str in fKeyMap) {
        dispatch({ type: 'SET_FILTER', mode: fKeyMap[str]! });
      }
    }

    if (process.stdin.isTTY) {
      process.stdin.on('data', handleData);
      return () => {
        process.stdin.off('data', handleData);
      };
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (state.zenMode) {
    return (
      <Box flexDirection="column" width={columns} height={rows}>
        <ZenMode
          events={selectedEvents}
          agentName={selectedAgent?.name || 'none'}
          filterMode={state.filterMode}
          height={rows - inputHeight}
          width={columns}
          autoScrollEnabled={autoScrollEnabled}
          scrollOffset={scrollOffset}
        />
        <InputBar
          agentName={selectedAgent?.name || 'none'}
          value={state.inputValue}
          onChange={handleInputChange}
          onSubmit={handleInputSubmit}
          focused={state.focusPanel === 'input'}
          width={columns}
          broadcastCount={broadcastCount}
        />
        {state.helpVisible && <HelpOverlay width={columns} height={rows} onClose={() => dispatch({ type: 'TOGGLE_HELP' })} />}
        {state.timelineVisible && (
          <Timeline
            eventBuffers={state.eventBuffers}
            agents={state.agents}
            width={columns}
            height={rows}
            onClose={handleTimelineClose}
          />
        )}
        {state.agentChatVisible && (
          <AgentChat
            eventBuffers={state.eventBuffers}
            agents={state.agents}
            width={columns}
            height={rows}
            onClose={handleAgentChatClose}
          />
        )}
        {state.diffVisible && (
          <DiffModal
            content={state.diffContent}
            agentName={selectedAgent?.name || 'none'}
            width={columns}
            height={rows}
            onClose={handleDiffClose}
          />
        )}
        {state.costVisible && (
          <CostDashboard
            agents={state.agents}
            width={columns}
            height={rows}
            onClose={handleCostClose}
          />
        )}
        <ToastContainer toasts={state.toasts} onDismiss={handleToastDismiss} width={columns} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {/* Header */}
      <HeaderBar
        agents={state.agents}
        tasks={state.tasks}
        connected={state.connected}
        mockMode={mockMode}
        filterMode={state.filterMode}
        width={columns}
        systemStats={state.systemStats}
      />

      {/* Body: Sidebar + Feed + Detail */}
      <Box flexDirection="row" height={bodyHeight}>
        <AgentSidebar
          agents={state.agents}
          selectedAgentId={state.selectedAgentId}
          focused={state.focusPanel === 'sidebar'}
          height={bodyHeight}
          compact={compactNames}
          multiSelectMode={state.multiSelectMode}
          selectedAgentIds={state.selectedAgentIds}
        />

        {/* Separator */}
        <Box flexDirection="column" width={1}>
          {Array.from({ length: bodyHeight }, (_, i) => (
            <Text key={i} dimColor>{'\u2502'}</Text>
          ))}
        </Box>

        <LiveFeed
          events={selectedEvents}
          agentName={selectedAgent?.name || 'none'}
          filterMode={state.filterMode}
          height={bodyHeight}
          width={feedWidth}
          scrollOffset={scrollOffset}
          autoScrollEnabled={autoScrollEnabled}
          focused={state.focusPanel === 'feed'}
          pinnedEventIds={pinnedEventIds}
        />

        {showDetailPanel && (
          <>
            {/* Separator */}
            <Box flexDirection="column" width={1}>
              {Array.from({ length: bodyHeight }, (_, i) => (
                <Text key={`d${i}`} dimColor>{'\u2502'}</Text>
              ))}
            </Box>

            <DetailPanel
              agent={selectedAgent}
              tasks={state.tasks}
              events={selectedEvents}
              height={bodyHeight}
            />
          </>
        )}
      </Box>

      {/* Input bar */}
      <InputBar
        agentName={selectedAgent?.name || 'none'}
        value={state.inputValue}
        onChange={handleInputChange}
        onSubmit={handleInputSubmit}
        focused={state.focusPanel === 'input'}
        width={columns}
        broadcastCount={broadcastCount}
      />

      {/* Overlays */}
      {state.helpVisible && <HelpOverlay width={columns} height={rows} onClose={() => dispatch({ type: 'TOGGLE_HELP' })} />}
      {state.timelineVisible && (
        <Timeline
          eventBuffers={state.eventBuffers}
          agents={state.agents}
          width={columns}
          height={rows}
          onClose={handleTimelineClose}
        />
      )}
      {state.agentChatVisible && (
        <AgentChat
          eventBuffers={state.eventBuffers}
          agents={state.agents}
          width={columns}
          height={rows}
          onClose={handleAgentChatClose}
        />
      )}
      {state.diffVisible && (
        <DiffModal
          content={state.diffContent}
          agentName={selectedAgent?.name || 'none'}
          width={columns}
          height={rows}
          onClose={handleDiffClose}
        />
      )}
      {state.costVisible && (
        <CostDashboard
          agents={state.agents}
          width={columns}
          height={rows}
          onClose={handleCostClose}
        />
      )}
      <ToastContainer toasts={state.toasts} onDismiss={handleToastDismiss} width={columns} />
    </Box>
  );
}
