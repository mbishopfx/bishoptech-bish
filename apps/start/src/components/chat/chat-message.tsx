// Single chat message renderer (user/assistant).
import type { UIMessage } from 'ai'
import type { ChatMessageMetadata } from '@/lib/chat-contracts/message-metadata'
import type { ChatAttachment } from '@/lib/chat-contracts/attachments'
import {
  AssistantMessageParts,
  AssistantMessageActions,
  UserMessageActions,
} from './message-parts'

function getRawMessageText(message: UIMessage): string {
  if (message.parts.length === 0) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n\n')
    .trim()
}

function getFileTypeIndicator(fileName: string): string {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === normalized.length - 1) return 'FILE'
  return normalized.slice(dotIndex + 1).toUpperCase()
}

type ChatMessageProps = {
  message: UIMessage
  isAnimating?: boolean
  canRegenerate: boolean
  onRegenerate: (messageId: string) => void
  branchSelector?: {
    optionMessageIds: readonly string[]
    selectedMessageId: string
    disabled?: boolean
    onSelectMessageId: (messageId: string) => void
  }
}

export function ChatMessage({
  message,
  isAnimating = false,
  canRegenerate,
  onRegenerate,
  branchSelector,
}: ChatMessageProps) {
  const text = getRawMessageText(message)
  const isUser = message.role === 'user'
  const metadata = message.metadata as ChatMessageMetadata | undefined
  const attachmentManifest = (isUser ? metadata?.attachments ?? [] : []).filter(
    (attachment): attachment is ChatAttachment =>
      !!attachment &&
      typeof attachment === 'object' &&
      typeof attachment.key === 'string' &&
      typeof attachment.name === 'string' &&
      typeof attachment.contentType === 'string',
  )
  const modelName = !isUser && typeof metadata?.model === 'string'
    ? metadata.model
    : null

  if (isUser) {
    return (
      <div
        className="group flex w-full items-end justify-end gap-2 pt-8 pb-1 is-user"
        data-role={message.role}
      >
        <div className="flex max-w-[80%] flex-col items-end gap-2">
          <div
            dir="auto"
            className="relative flex min-h-7 w-fit max-w-full self-end flex-col gap-3 overflow-hidden rounded-3xl rounded-br-lg border border-border-default bg-bg-subtle px-4 py-1.5 text-md"
          >
            <div className="space-y-4 size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <div className="whitespace-pre-wrap break-words text-md leading-7">
                {text || '\u00a0'}
              </div>
            </div>
          </div>
          {attachmentManifest.length > 0 && (
            <div className="flex w-full flex-wrap justify-end gap-2">
              {attachmentManifest.map((attachment) => (
                <div
                  key={attachment.key}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border-muted bg-bg-subtle px-2.5 py-1 text-xs"
                >
                  <span className="rounded bg-bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-content-muted">
                    {getFileTypeIndicator(attachment.name)}
                  </span>
                  <span className="truncate text-content-muted">
                    {attachment.name}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="w-full">
            <UserMessageActions
              messageId={message.id}
              text={text}
              canRegenerate={canRegenerate}
              onRegenerate={onRegenerate}
              branchSelector={branchSelector}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex w-full items-end gap-2 py-1 is-assistant"
      data-role={message.role}
    >
      <div
        dir="auto"
        className="flex w-full flex-col gap-3 overflow-hidden text-content-emphasis leading-[21px]"
      >
        <div className="space-y-4 size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <AssistantMessageParts
            parts={message.parts}
            isMessageStreaming={isAnimating}
          />
        </div>
        <AssistantMessageActions
          messageId={message.id}
          text={text}
          modelName={modelName}
          canRegenerate={canRegenerate}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  )
}
