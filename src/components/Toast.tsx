import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import type { Toast as ToastType } from '../types.js';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
  width: number;
}

const TOAST_COLORS: Record<ToastType['level'], string> = {
  info: '#5fd7ff',
  success: '#00d787',
  warning: '#d7af00',
  error: '#ff5f5f',
};

const TOAST_ICONS: Record<ToastType['level'], string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✖',
};

function ToastContainerInner({ toasts, onDismiss, width }: ToastContainerProps) {
  // Auto-dismiss toasts after 3 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const toast of toasts) {
      const remaining = 3000 - (Date.now() - toast.createdAt);
      if (remaining <= 0) {
        onDismiss(toast.id);
      } else {
        timers.push(setTimeout(() => onDismiss(toast.id), remaining));
      }
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  // Show only last 3 toasts
  const visible = toasts.slice(-3);
  const toastWidth = Math.min(40, width - 4);

  return (
    <Box
      position="absolute"
      marginLeft={width - toastWidth - 2}
      marginTop={1}
      flexDirection="column"
    >
      {visible.map((toast) => {
        const color = TOAST_COLORS[toast.level];
        const icon = TOAST_ICONS[toast.level];
        return (
          <Box key={toast.id} width={toastWidth} marginBottom={0}>
            <Text backgroundColor={color === '#ff5f5f' ? '#3a1515' : '#1a2a3a'}>
              <Text color={color}>{` ${icon} `}</Text>
              <Text wrap="truncate">{toast.message.slice(0, toastWidth - 6)}</Text>
              <Text>{' '}</Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

export const ToastContainer = React.memo(ToastContainerInner);
