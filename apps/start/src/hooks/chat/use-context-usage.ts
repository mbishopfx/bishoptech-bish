'use client'

import { useMemo } from 'react'
import type { UIMessage } from 'ai'
import type { ChatMessageMetadata } from '@/lib/chat-contracts/message-metadata'

/** Approximate tokens from text (≈4 chars per token for English). */
function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Extracts plain text from a UIMessage for token estimation. */
function textFromMessage(
  message: UIMessage<ChatMessageMetadata>,
): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string',
    )
    .map((part) => part.text)
    .join('')
}

/** Computes used tokens from messages for context display. */
function computeContextUsage(
  messages: UIMessage<ChatMessageMetadata>[],
): number {
  let usedTokens = 0

  for (const message of messages) {
    if (message.role === 'assistant') {
      const total = message.metadata?.totalTokens
      usedTokens +=
        typeof total === 'number'
          ? total
          : estimateTokensFromText(textFromMessage(message))
    } else if (message.role === 'user') {
      usedTokens += estimateTokensFromText(textFromMessage(message))
    }
  }

  return usedTokens
}

/**
 * Hook that computes context window usage from chat messages.
 * Used by the thread context indicator in the composer bar.
 */
export function useContextUsage(messages: UIMessage<ChatMessageMetadata>[]): {
  usedTokens: number
} {
  return useMemo(
    () => ({ usedTokens: computeContextUsage(messages) }),
    [messages],
  )
}
