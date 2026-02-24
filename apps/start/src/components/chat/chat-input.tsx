// Chat prompt input with error slot and file attachments.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatActions } from './chat-context'
import {
  PromptInputRoot,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputThinking,
  PromptInputError,
  PromptInputAttachments,
  ToolbarSelect,
} from './prompt-input'
import { ModelSelectorPanel } from './model-selector-panel'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import { useFileAttachments } from '../../hooks/chat/upload'
import { parseChatApiError } from './chat-error-messages'

export function ChatInput() {
  const {
    sendMessage,
    status,
    error,
    selectableModels,
    selectedModelId,
    selectedReasoningEffort,
    setSelectedModelId,
    setSelectedReasoningEffort,
  } = useChatActions()
  const [input, setInput] = useState('')
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [uploadErrorDismissed, setUploadErrorDismissed] = useState(false)
  const inputRef = useRef<{ focus: () => void }>(null)

  // File upload: images and PDF, max 10 files.
  const { files, handleFileSelect, handleRemoveFile, canAddMore } =
    useFileAttachments({ maxFiles: 10 })

  const isBusy = status === 'submitted' || status === 'streaming'
  const isEmpty = !input.trim()
  const parsedChatError = parseChatApiError(error)
  const chatErrorMessage = parsedChatError?.message ?? null
  const chatErrorTraceId = parsedChatError?.traceId ?? null
  const uploadErrorMessage =
    files.find((file) => !!file.uploadError)?.uploadError ?? null
  const showChatError = !!chatErrorMessage && !errorDismissed
  const showUploadError = !!uploadErrorMessage && !uploadErrorDismissed
  const activeErrorMessage = showChatError
    ? chatErrorMessage
    : showUploadError
      ? uploadErrorMessage
      : null

  useEffect(() => {
    if (error) setErrorDismissed(false)
  }, [error])

  useEffect(() => {
    if (uploadErrorMessage) setUploadErrorDismissed(false)
  }, [uploadErrorMessage])

  const handleDismissError = useCallback(() => setErrorDismissed(true), [])
  const handleDismissUploadError = useCallback(
    () => setUploadErrorDismissed(true),
    [],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || isBusy) return
      setInput('')
      void sendMessage({ text }).catch(() => {
        setInput(text)
        // Error is surfaced by chat context.
      })
    },
    [input, isBusy, sendMessage],
  )

  const selectedModel = selectableModels.find((m) => m.id === selectedModelId)
  const reasoningOptions = selectedModel?.reasoningEfforts ?? []

  const hasReasoningOptions = reasoningOptions.length > 0

  const modelAndReasoningSelectors = (
    <div className="flex items-center gap-1">
      <ModelSelectorPanel
        value={selectedModelId}
        onValueChange={setSelectedModelId}
        options={selectableModels.map((m) => ({ id: m.id, name: m.name }))}
        disabled={isBusy}
      />
      {hasReasoningOptions && (
        <ToolbarSelect
          value={selectedReasoningEffort ?? ''}
          onChange={(v) =>
            setSelectedReasoningEffort(
              v ? (v as AiReasoningEffort) : undefined,
            )
          }
          options={[
            {
              value: '',
              label:
                selectedModel?.defaultReasoningEffort ?? 'Default reasoning',
            },
            ...reasoningOptions.map((effort) => ({
              value: effort,
              label: effort,
            })),
          ]}
          aria-label="Reasoning"
          disabled={isBusy}
        />
      )}
    </div>
  )

  const topSlot = (
    <>
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <div className="text-xs text-content-muted">
          Tools:{' '}
          {(selectedModel?.visibleTools ?? []).join(', ') || 'None'}
        </div>
      </div>
      {activeErrorMessage ? (
        <PromptInputError
          error={activeErrorMessage}
          traceId={showChatError ? chatErrorTraceId : undefined}
          onDismiss={
            showChatError ? handleDismissError : handleDismissUploadError
          }
        />
      ) : null}
      {files.length > 0 && (
        <PromptInputAttachments files={files} onRemove={handleRemoveFile} />
      )}
      {!activeErrorMessage ? <PromptInputThinking isVisible={isBusy} /> : null}
    </>
  )

  return (
    <PromptInputRoot
      onSubmit={handleSubmit}
      className="w-full"
      slots={{ top: topSlot }}
    >
      <PromptInputTextarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isBusy}
        aria-label="Message"
      />

      <PromptInputToolbar
        canAddMore={canAddMore}
        onFileSelect={handleFileSelect}
        status={status}
        isEmpty={isEmpty}
        isBusy={isBusy}
        onFocusInput={() => inputRef.current?.focus()}
        afterAttach={modelAndReasoningSelectors}
      />
    </PromptInputRoot>
  )
}
