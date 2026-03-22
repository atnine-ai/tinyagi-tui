import React from 'react';
import { Box, Text } from 'ink';

interface ModalBoxProps {
  title: string;
  width: number;
  height: number;
  footer?: string;
  children: React.ReactNode;
}

const BG = '#111111';

/**
 * Full-screen modal with opaque background.
 * Renders a solid background that covers the entire terminal,
 * then places a bordered content box centered on top.
 */
function ModalBoxInner({ title, width, height, footer, children }: ModalBoxProps) {
  const boxWidth = Math.min(width - 4, width);
  const boxHeight = height;

  // Fill every line with background to create an opaque overlay
  const bgLine = ' '.repeat(Math.max(boxWidth, 1));

  return (
    <Box
      position="absolute"
      marginLeft={0}
      marginTop={0}
      flexDirection="column"
      width={width}
      height={height}
    >
      {/* Background fill */}
      {Array.from({ length: height }, (_, i) => (
        <Box key={`bg-${i}`} position="absolute" marginTop={i}>
          <Text backgroundColor={BG}>{bgLine.slice(0, width)}</Text>
        </Box>
      ))}

      {/* Content box */}
      <Box
        position="absolute"
        marginLeft={2}
        marginTop={1}
        flexDirection="column"
        width={boxWidth - 4}
        height={boxHeight - 2}
      >
        {/* Title bar */}
        <Box flexDirection="row" justifyContent="space-between" width={boxWidth - 4}>
          <Text bold color="#5fd7ff">{title}</Text>
          <Text color="#888888">[Esc] close</Text>
        </Box>
        <Text color="#444444">{'─'.repeat(Math.max(boxWidth - 4, 1))}</Text>

        {/* Body */}
        <Box flexDirection="column" flexGrow={1}>
          {children}
        </Box>

        {/* Footer */}
        {footer && (
          <>
            <Text color="#444444">{'─'.repeat(Math.max(boxWidth - 4, 1))}</Text>
            <Text color="#888888">{footer}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

export const ModalBox = React.memo(ModalBoxInner);
