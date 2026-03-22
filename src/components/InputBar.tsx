import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputBarProps {
  agentName: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  focused: boolean;
  width: number;
  broadcastCount?: number;
}

const MAX_LINES = 5;
const LINE_SEP = '\n';

function InputBarInner({ agentName, value, onChange, onSubmit, focused, width, broadcastCount }: InputBarProps) {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Split value into lines
  const lines = value.split(LINE_SEP);
  const currentLineIndex = lines.length - 1;
  const inputHeight = Math.min(lines.length, MAX_LINES) + 1; // +1 for separator

  const prompt = broadcastCount && broadcastCount > 0
    ? `Broadcast to ${broadcastCount} agents`
    : `@${agentName}`;
  const promptColor = broadcastCount && broadcastCount > 0 ? '#ffd75f' : (focused ? '#5fd7ff' : '#808080');

  // Handle raw keyboard input when focused
  useInput((input, key) => {
    if (!focused) return;

    if (key.return) {
      // Check if last char is backslash — means newline
      const currentLine = lines[currentLineIndex] || '';
      if (currentLine.endsWith('\\')) {
        // Remove trailing \ and add a new line
        const newLines = [...lines];
        newLines[currentLineIndex] = currentLine.slice(0, -1);
        if (newLines.length < MAX_LINES) {
          newLines.push('');
        }
        onChange(newLines.join(LINE_SEP));
      } else {
        // Submit the full message
        const fullText = lines.join('\n').trim();
        if (fullText) {
          onSubmit(fullText);
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      const currentLine = lines[currentLineIndex] || '';
      if (currentLine.length > 0) {
        const newLines = [...lines];
        newLines[currentLineIndex] = currentLine.slice(0, -1);
        onChange(newLines.join(LINE_SEP));
      } else if (lines.length > 1) {
        // Delete empty line, go back to previous
        const newLines = lines.slice(0, -1);
        onChange(newLines.join(LINE_SEP));
      }
      return;
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta) {
      const newLines = [...lines];
      newLines[currentLineIndex] = (newLines[currentLineIndex] || '') + input;
      onChange(newLines.join(LINE_SEP));
    }
  }, { isActive: focused });

  // Cursor blink
  React.useEffect(() => {
    if (!focused) return;
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, [focused]);

  const cursor = focused && cursorVisible ? '█' : ' ';

  return (
    <Box
      flexDirection="column"
      width={width}
      height={inputHeight}
    >
      <Box width={width}>
        <Text color="#444444">{'─'.repeat(Math.max(width, 40))}</Text>
      </Box>

      {lines.map((line, i) => (
        <Box key={i} flexDirection="row" width={width}>
          {i === 0 ? (
            <Text color={promptColor}>{`> ${prompt}: `}</Text>
          ) : (
            <Text color="#444444">{'  ... '}</Text>
          )}
          <Text>{line}</Text>
          {i === currentLineIndex && <Text color="#5fd7ff">{cursor}</Text>}
        </Box>
      ))}

      {lines.length === 1 && !value && (
        <Box position="absolute" marginLeft={prompt.length + 5}>
          <Text color="#555555">Type a message... (\ + Enter for newline)</Text>
        </Box>
      )}
    </Box>
  );
}

export const InputBar = React.memo(InputBarInner);
