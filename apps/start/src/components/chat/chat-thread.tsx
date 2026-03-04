// Renders chat messages and keeps scroll pinned to the latest user message.
import { useCallback, useMemo } from 'react'
import { Spinner } from '@rift/ui/spinner'
import { useChatActions, useChatMessages } from './chat-context'
import { ChatMessage } from './chat-message'
import { usePinToLastUserMessage } from '@rift/chat-scroll'
import { ChatWelcomeScreen } from './chat-welcome-screen'
import { setComposerDraft } from './composer-draft-store'
import { m } from '@/paraglide/messages.js'

export function ChatThread() {
  const { messages, status, activeThreadId, branchSelectorsByAnchorMessageId } =
    useChatMessages()
  const {
    regenerateMessage,
    editMessage,
    selectBranchVersion,
  } =
    useChatActions()
  const { userMessageCount, lastUserMessageId } = useMemo(() => {
    let count = 0
    let lastUserId: string | null = null

    for (const message of messages) {
      if (message.role !== 'user') continue
      count += 1
      lastUserId = message.id
    }

    return { userMessageCount: count, lastUserMessageId: lastUserId }
  }, [messages])

  const { lastUserMessageRef, contentEndRef, spacerRef, bottomRef } =
    usePinToLastUserMessage({
      resetKey: activeThreadId,
      userMessageCount,
      lastUserMessageId,
      messages,
      status,
    })

  const isStreaming = status === 'submitted' || status === 'streaming'
  const isAwaitingStreamStart = status === 'submitted'
  const lastMessage = messages.at(-1)
  const showThinking =
    isAwaitingStreamStart && (!lastMessage || lastMessage.role === 'user')

  const canRegenerate = !isStreaming
  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      setComposerDraft(prompt)
    },
    [],
  )

  const findScrollParent = useCallback((node: HTMLElement | null) => {
    let current: HTMLElement | null = node?.parentElement ?? null
    while (current) {
      const style = window.getComputedStyle(current)
      const overflowY = style.overflowY
      const isScrollableOverflow =
        overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
      if (isScrollableOverflow && current.scrollHeight > current.clientHeight) {
        return current
      }
      current = current.parentElement
    }
    return null
  }, [])

  const regenerateWithoutScrollShift = useCallback(
    (messageId: string) => {
      const scrollParent = findScrollParent(contentEndRef.current)
      const preservedScrollTop = scrollParent?.scrollTop

      void regenerateMessage(messageId)

      if (!scrollParent || preservedScrollTop == null) return
      requestAnimationFrame(() => {
        scrollParent.scrollTop = preservedScrollTop
        requestAnimationFrame(() => {
          scrollParent.scrollTop = preservedScrollTop
        })
      })
    },
    [contentEndRef, findScrollParent, regenerateMessage],
  )

  const editWithoutScrollShift = useCallback(
    async (input: { messageId: string; editedText: string }) => {
      const scrollParent = findScrollParent(contentEndRef.current)
      const preservedScrollTop = scrollParent?.scrollTop

      const editPromise = editMessage(input)

      if (!scrollParent || preservedScrollTop == null) {
        await editPromise
        return
      }
      requestAnimationFrame(() => {
        scrollParent.scrollTop = preservedScrollTop
        requestAnimationFrame(() => {
          scrollParent.scrollTop = preservedScrollTop
        })
      })
      await editPromise
    },
    [contentEndRef, editMessage, findScrollParent],
  )

  const selectBranchVersionWithoutScrollShift = useCallback(
    async (input: { parentMessageId: string; childMessageId: string }) => {
      const scrollParent = findScrollParent(contentEndRef.current)
      const preservedScrollTop = scrollParent?.scrollTop

      if (!scrollParent || preservedScrollTop == null) {
        await selectBranchVersion(input)
        return
      }

      const restoreScroll = () => {
        requestAnimationFrame(() => {
          scrollParent.scrollTop = preservedScrollTop
          requestAnimationFrame(() => {
            scrollParent.scrollTop = preservedScrollTop
          })
        })
      }

      // Restore immediately to absorb synchronous layout changes.
      restoreScroll()
      await selectBranchVersion(input)
      // Restore again after branch mutation settles to avoid auto-pin jumps.
      restoreScroll()
    },
    [contentEndRef, findScrollParent, selectBranchVersion],
  )

  return (
    <div
      className="flex w-full flex-col"
      role="log"
      aria-live="polite"
      aria-label={m.chat_thread_messages_aria_label()}
    >
      {messages.length === 0 && (
        <div className="relative w-full overflow-hidden pt-9">
          <div className="relative z-10 mx-auto w-full max-w-2xl">
            <ChatWelcomeScreen
              onSuggestionClick={handleSuggestionClick}
              disabled={isStreaming}
            />
          </div>
        </div>
      )}
      {messages.map((m) => {
        const isLastUserMessage =
          m.role === 'user' &&
          lastUserMessageId != null &&
          m.id === lastUserMessageId
        const isAnimatingMessage =
          isStreaming && lastMessage?.id === m.id && m.role === 'assistant'
        return (
          <div
            key={m.id}
            className="mx-auto w-full max-w-2xl"
            ref={isLastUserMessage ? lastUserMessageRef : undefined}
          >
            <ChatMessage
              message={m}
              isAnimating={isAnimatingMessage}
              canRegenerate={canRegenerate}
              canEdit={!isStreaming}
              onRegenerate={regenerateWithoutScrollShift}
              onEdit={editWithoutScrollShift}
              branchSelector={
                m.role === 'user' ? (() => {
                  const selector = branchSelectorsByAnchorMessageId[m.id]
                  if (!selector) return undefined
                  return {
                    parentMessageId: selector.parentMessageId,
                    optionMessageIds: selector.optionMessageIds,
                    selectedMessageId: selector.selectedMessageId,
                    disabled: isStreaming,
                    onSelectMessageId: (childMessageId: string) => {
                      void selectBranchVersionWithoutScrollShift({
                        parentMessageId: selector.parentMessageId,
                        childMessageId,
                      })
                    },
                  }
                })() : undefined
              }
            />
          </div>
        )
      })}
      {showThinking && (
        <div
          className="group mx-auto flex w-full max-w-2xl items-end gap-2 py-4 is-assistant"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex w-full flex-col gap-3 overflow-hidden text-content-emphasis text-md leading-[21px]">
            <div className="w-full">
              <div className="py-1">
                <Spinner size={24} className="animate-spin" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={contentEndRef} aria-hidden style={{ height: 0 }} />
      <div ref={spacerRef} aria-hidden style={{ height: 0 }} />
      <div ref={bottomRef} />
    </div>
  )
}
