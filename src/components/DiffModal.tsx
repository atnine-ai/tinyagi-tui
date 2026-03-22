import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ModalBox } from './ModalBox.js';

interface DiffModalProps {
  content: string;
  agentName: string;
  width: number;
  height: number;
  onClose: () => void;
}

function DiffModalInner({ content, agentName, width, height, onClose }: DiffModalProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const lines = content.split('\n');
  const visibleCount = Math.max(height - 8, 3);
  const contentWidth = width - 8;

  useInput((input, key) => {
    if (key.escape || input === 'd') { onClose(); return; }
    if (input === 'j' || key.downArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, lines.length - visibleCount)));
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
    }
    if (input === 'G') { setScrollOffset(Math.max(0, lines.length - visibleCount)); }
    if (input === 'g') { setScrollOffset(0); }
  });

  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleCount);
  const footer = lines.length > visibleCount
    ? `[j/k] scroll  [g/G] top/bottom  [${scrollOffset + 1}-${Math.min(scrollOffset + visibleCount, lines.length)}/${lines.length}]  [Esc] close`
    : '[Esc] close';

  return (
    <ModalBox title={`Git Diff — @${agentName} (${lines.length} lines)`} width={width} height={height} footer={footer}>
      {content === '' ? (
        <Box justifyContent="center" flexGrow={1}>
          <Text color="#888888">No changes (working tree clean)</Text>
        </Box>
      ) : content.startsWith('No git repo') || content.startsWith('Error:') ? (
        <Box justifyContent="center" flexGrow={1}>
          <Text color="#ff5f5f">{content}</Text>
        </Box>
      ) : (
        visibleLines.map((line, i) => {
          let color: string | undefined;
          if (line.startsWith('+') && !line.startsWith('+++')) color = '#00d787';
          else if (line.startsWith('-') && !line.startsWith('---')) color = '#ff5f5f';
          else if (line.startsWith('@@')) color = '#5fd7ff';
          else if (line.startsWith('diff ') || line.startsWith('index ')) color = '#af87ff';
          return (
            <Box key={`${scrollOffset}-${i}`}>
              <Text color={color} dimColor={!color} wrap="truncate">{line.slice(0, contentWidth)}</Text>
            </Box>
          );
        })
      )}
    </ModalBox>
  );
}

export const DiffModal = React.memo(DiffModalInner);
