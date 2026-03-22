import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ModalBox } from './ModalBox.js';

interface HelpOverlayProps {
  width: number;
  height: number;
  onClose: () => void;
}

const SHORTCUTS = [
  ['j / ↓', 'Next agent'],
  ['k / ↑', 'Previous agent'],
  ['1-9', 'Jump to agent by index'],
  ['/', 'Focus input bar'],
  ['Enter', 'Send message'],
  ['f', 'Toggle zen mode'],
  ['Tab', 'Cycle focus between panels'],
  ['e', 'Expand/collapse event'],
  ['G', 'Jump to bottom (auto-scroll)'],
  ['Space', 'Pause/resume auto-scroll'],
  ['s', 'Activity timeline'],
  ['m', 'Agent-to-agent messages'],
  ['d', 'Git diff for selected agent'],
  ['$', 'Cost dashboard'],
  ['p', 'Pin/unpin latest event'],
  ['Ctrl+1-5', 'Quick commands (status/test/PR/commit/blockers)'],
  ['Ctrl+B', 'Enter broadcast mode (multi-select)'],
  ['Space', 'Toggle agent selection (in broadcast)'],
  ['Ctrl+A', 'Select all agents (in broadcast)'],
  ['F1-F6', 'Filter by event type'],
  ['Esc', 'Cancel / close overlay'],
  ['?', 'Toggle this help'],
  ['q', 'Quit'],
];

function HelpOverlayInner({ width, height, onClose }: HelpOverlayProps) {
  useInput((input, key) => {
    if (key.escape || input === '?') {
      onClose();
    }
  });

  const visibleCount = Math.min(SHORTCUTS.length, height - 8);
  const colWidth = Math.min(width - 12, 50);

  return (
    <ModalBox title="Keyboard Shortcuts" width={width} height={height} footer="Press ? or Esc to close">
      {SHORTCUTS.slice(0, visibleCount).map(([key, desc], i) => (
        <Box key={i} flexDirection="row" width={colWidth}>
          <Text bold color="#ffd75f">{(key ?? '').padEnd(12)}</Text>
          <Text>{desc}</Text>
        </Box>
      ))}
    </ModalBox>
  );
}

export const HelpOverlay = React.memo(HelpOverlayInner);
