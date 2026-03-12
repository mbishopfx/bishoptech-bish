import { useEffect, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import {
  clearSearchHighlights,
  highlightSearchQueryInMessage,
} from './chat-search-highlight'
import {
  clearPendingChatSearchReveal,
  getPendingChatSearchReveal,
  subscribeToChatSearchReveal,
  type ChatSearchRevealRequest,
} from './chat-search-reveal-store'

type UseChatSearchRevealInput = {
  readonly activeThreadId?: string
  readonly messages: readonly UIMessage[]
  readonly revealMessageBranch: (input: { messageId: string }) => Promise<boolean>
}

type UseChatSearchRevealResult = {
  readonly disableInitialAlignment: boolean
}

/**
 * Coordinates the transient command-search reveal flow for a hydrated thread:
 * - waits for the requested thread to be active
 * - activates hidden branch paths when the target message is not canonical
 * - scrolls to the message and highlights the literal query text
 */
export function useChatSearchReveal(
  input: UseChatSearchRevealInput,
): UseChatSearchRevealResult {
  const [pendingReveal, setPendingReveal] = useState<ChatSearchRevealRequest | null>(
    () => getPendingChatSearchReveal(),
  )
  const handledRevealKeyRef = useRef<string | null>(null)
  const attemptedRevealSwitchKeyRef = useRef<string | null>(null)

  useEffect(() => {
    return subscribeToChatSearchReveal(() => {
      setPendingReveal(getPendingChatSearchReveal())
    })
  }, [])

  useEffect(() => {
    if (!pendingReveal || pendingReveal.threadId !== input.activeThreadId) {
      return
    }

    const revealKey = `${pendingReveal.threadId}:${pendingReveal.messageId}:${pendingReveal.nonce}`
    if (handledRevealKeyRef.current === revealKey) {
      return
    }

    const targetExists = input.messages.some(
      (message) => message.id === pendingReveal.messageId,
    )
    if (!targetExists) {
      // Hidden-branch hits need a branch switch before the canonical message
      // list can contain the searched message. Retry only when resolution
      // failed so we do not spam the branch mutator during query propagation.
      if (attemptedRevealSwitchKeyRef.current === revealKey) {
        return
      }

      attemptedRevealSwitchKeyRef.current = revealKey
      void input
        .revealMessageBranch({
          messageId: pendingReveal.messageId,
        })
        .then((didResolveTarget) => {
          if (
            !didResolveTarget &&
            attemptedRevealSwitchKeyRef.current === revealKey
          ) {
            attemptedRevealSwitchKeyRef.current = null
            clearPendingChatSearchReveal()
          }
        })
      return
    }

    handledRevealKeyRef.current = revealKey
    attemptedRevealSwitchKeyRef.current = null

    const messageElement = document.getElementById(
      `chat-message-${pendingReveal.messageId}`,
    )
    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (messageElement && pendingReveal.query.trim().length > 0) {
      requestAnimationFrame(() => {
        highlightSearchQueryInMessage({
          container: messageElement,
          query: pendingReveal.query,
        })
      })
    }

    const clearHighlight = window.setTimeout(() => {
      clearSearchHighlights(messageElement)
      clearPendingChatSearchReveal()
    }, 3200)

    return () => {
      window.clearTimeout(clearHighlight)
    }
  }, [input.activeThreadId, input.messages, input.revealMessageBranch, pendingReveal])

  return {
    disableInitialAlignment: pendingReveal?.threadId === input.activeThreadId,
  }
}
