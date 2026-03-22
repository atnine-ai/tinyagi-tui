import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { LogEvent, Agent } from '../types.js';
import { formatTime } from '../lib/format.js';
import { ModalBox } from './ModalBox.js';

interface AgentChatProps {
  eventBuffers: Map<string, LogEvent[]>;
  agents: Agent[];
  width: number;
  height: number;
  onClose: () => void;
}

interface AgentMessage {
  timestamp: number;
  senderName: string;
  receiverName: string;
  message: string;
}

const AGENT_MSG_PATTERN = /\[@([^\]:]+)(?::([^\]]*))?\]/;

function AgentChatInner({ eventBuffers, agents, width, height, onClose }: AgentChatProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) map.set(agent.id, agent);
    return map;
  }, [agents]);

  const messages = useMemo(() => {
    const allMessages: AgentMessage[] = [];
    for (const [agentId, events] of eventBuffers) {
      const senderAgent = agentMap.get(agentId);
      const senderName = senderAgent?.name || agentId;
      for (const event of events) {
        if (event.type !== 'response') continue;
        const match = AGENT_MSG_PATTERN.exec(event.content);
        if (!match) continue;
        const receiverName = match[1] || 'unknown';
        const cleanMessage = event.content.replace(AGENT_MSG_PATTERN, '').trim();
        allMessages.push({
          timestamp: event.timestamp,
          senderName, receiverName,
          message: cleanMessage || event.content,
        });
      }
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    return allMessages;
  }, [eventBuffers, agentMap]);

  const visibleCount = Math.max(height - 8, 3);

  useInput((input, key) => {
    if (key.escape || input === 'm') { onClose(); return; }
    if (input === 'j' || key.downArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, messages.length - visibleCount)));
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
    }
  });

  const visibleMessages = messages.slice(scrollOffset, scrollOffset + visibleCount);
  const contentWidth = width - 40;
  const footer = messages.length > visibleCount
    ? `[j/k] scroll  [${scrollOffset + 1}-${Math.min(scrollOffset + visibleCount, messages.length)}/${messages.length}]  [m/Esc] close`
    : '[m/Esc] close';

  return (
    <ModalBox title={`Agent-to-Agent Messages (${messages.length})`} width={width} height={height} footer={footer}>
      {messages.length === 0 ? (
        <Box justifyContent="center" flexGrow={1}>
          <Text color="#888888">No inter-agent messages found. Looking for [@agent] patterns in responses...</Text>
        </Box>
      ) : (
        visibleMessages.map((msg, i) => {
          const ts = formatTime(msg.timestamp);
          return (
            <Box key={`${msg.timestamp}-${i}`} flexDirection="row">
              <Text color="#888888">{ts}</Text>
              <Text> </Text>
              <Text color="#5fd7ff" bold>@{msg.senderName}</Text>
              <Text color="#888888"> → </Text>
              <Text color="#af87ff" bold>@{msg.receiverName}</Text>
              <Text>: </Text>
              <Text wrap="truncate">{msg.message.slice(0, contentWidth)}</Text>
            </Box>
          );
        })
      )}
    </ModalBox>
  );
}

export const AgentChat = React.memo(AgentChatInner);
