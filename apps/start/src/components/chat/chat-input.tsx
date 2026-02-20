'use client'

import { useCallback, useState } from 'react'
import { useChat } from './chat-context'
import {
  PromptInputRoot,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from './prompt-input'

/**
 * Chat input container: wires useChat (domain) to presentational prompt-input UI.
 * Keeps domain logic (sendMessage, status, stop) and local input state here;
 * prompt-input components stay presentational and reusable.
 */
export function ChatInput() {
  const { sendMessage, status, stop } = useChat()
  const [input, setInput] = useState('')

  const isBusy = status === 'submitted' || status === 'streaming'
  const isEmpty = !input.trim()

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || isBusy) return
      sendMessage({ text })
      setInput('')
    },
    [input, isBusy, sendMessage]
  )

  return (
    <PromptInputRoot onSubmit={handleSubmit} className="w-full">
      <PromptInputTextarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything..."
        disabled={isBusy}
        aria-label="Message"
      />

      <PromptInputToolbar>
        <div className="flex flex-1" />
        <PromptInputSubmit
          status={status}
          onStop={stop}
          disabled={isEmpty || isBusy}
        />
      </PromptInputToolbar>
    </PromptInputRoot>
  )
}
