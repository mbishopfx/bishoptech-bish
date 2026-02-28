// Chat prompt input with error slot and file attachments.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useChatActions } from './chat-context'
import {
  PromptInputRoot,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputThinking,
  PromptInputError,
  PromptInputAttachments,
} from './prompt-input'
import { ModelSelectorPanel } from './model-selector-panel'
import { ReasoningSelectorPanel } from './reasoning-selector-panel'
import { useFileAttachments } from '../../hooks/chat/upload'
import { parseChatApiError } from './chat-error-messages'
import type {
  ChatAttachment,
  ChatAttachmentInput,
} from '@/lib/chat-contracts/attachments'

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

  // File upload: worker-supported markdown-convertible files, max 10 files.
  const { files, handleFileSelect, handleRemoveFile, clearFiles, canAddMore } =
    useFileAttachments({ maxFiles: 10 })

  const isBusy = status === 'submitted' || status === 'streaming'
  const hasPendingUploads = files.some((file) => file.isUploading)
  const isSendBlocked = isBusy || hasPendingUploads
  const isEmpty = !input.trim()
  const parsedChatError = parseChatApiError(error)
  const chatErrorMessage = parsedChatError?.message ?? null
  const chatErrorTraceId = parsedChatError?.traceId ?? null
  const uploadErrorMessage =
    files.find((file) => !!file.uploadError)?.uploadError ??
    null
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

  const buildAttachmentPayload = useCallback(() => {
    const uploadedFiles = files
      .map((file) => file.uploaded)
      .filter(
        (uploaded): uploaded is NonNullable<typeof uploaded> =>
          !!uploaded,
      )

    if (uploadedFiles.length === 0) return undefined

    const attachments = uploadedFiles
      .map((file): ChatAttachmentInput | null => {
        const attachmentId =
          typeof file.id === 'string' && file.id.trim().length > 0
            ? file.id.trim()
            : null
        return attachmentId ? { id: attachmentId } : null
      })
      .filter((attachment): attachment is ChatAttachmentInput => !!attachment)

    const attachmentManifest = uploadedFiles
      .map((file): ChatAttachment | null => {
        if (!file.id || !file.key || !file.url || !file.name || !file.contentType) {
          return null
        }
        return {
          id: file.id,
          key: file.key,
          url: file.url,
          name: file.name,
          size: file.size,
          contentType: file.contentType,
        }
      })
      .filter((attachment): attachment is ChatAttachment => !!attachment)

    return {
      attachments: attachments.length > 0 ? attachments : undefined,
      attachmentManifest:
        attachmentManifest.length > 0 ? attachmentManifest : undefined,
    }
  }, [files])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || isSendBlocked) return
      setInput('')

      try {
        const payload = buildAttachmentPayload()
        clearFiles()
        await sendMessage({
          text,
          attachments: payload?.attachments,
          attachmentManifest: payload?.attachmentManifest,
        })
      } catch (error) {
        setInput(text)
      }
    },
    [input, isSendBlocked, sendMessage, buildAttachmentPayload, clearFiles],
  )

  const selectedModel = selectableModels.find((m) => m.id === selectedModelId)
  const reasoningOptions = selectedModel?.reasoningEfforts ?? []

  const hasReasoningOptions = reasoningOptions.length > 0
  const selectorTriggerClassName =
    'h-8 rounded-full border border-transparent bg-transparent px-3 pr-7 text-sm leading-[21px] font-medium text-content-emphasis transition-colors hover:bg-bg-inverted/5 active:bg-bg-inverted/10 focus-visible:border-border-emphasis focus-visible:ring-2 focus-visible:ring-border-emphasis/40'

  const modelAndReasoningSelectors = (
    <div className="flex items-center gap-1">
      <ModelSelectorPanel
        value={selectedModelId}
        onValueChange={setSelectedModelId}
        options={selectableModels.map((m) => ({ id: m.id, name: m.name }))}
        disabled={isBusy}
        className={selectorTriggerClassName}
      />
      {hasReasoningOptions && (
        <ReasoningSelectorPanel
          value={selectedReasoningEffort}
          onValueChange={setSelectedReasoningEffort}
          options={reasoningOptions}
          defaultReasoningEffort={selectedModel?.defaultReasoningEffort}
          disabled={isBusy}
          className={selectorTriggerClassName}
        />
      )}
    </div>
  )

  const bottomSlot = (
    <div className="flex items-center justify-start px-1 p-1.5">
      {modelAndReasoningSelectors}
    </div>
  )

  const topSlot = (
    <>
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
      slots={{ top: topSlot, bottom: bottomSlot }}
    >
      <PromptInputToolbar
        canAddMore={canAddMore}
        onFileSelect={handleFileSelect}
        status={status}
        isEmpty={isEmpty}
        isBusy={isSendBlocked}
        middle={
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Message"
            className="placeholder:text-content-default/65"
          />
        }
      />
    </PromptInputRoot>
  )
}
