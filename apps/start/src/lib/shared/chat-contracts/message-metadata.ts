import type { ChatAttachment } from './attachments'

export type LocalListenerMessageMetadata = {
  readonly source: 'local_listener'
  readonly handoffId?: string
  readonly title: string
  readonly target: string
  readonly status: 'activity' | 'completed' | 'failed'
  readonly summary: string
  readonly activityKind?: 'info' | 'warning' | 'input_required' | 'resolved'
  readonly repoBranch?: string | null
  readonly repoCommitSha?: string | null
  readonly artifactNames?: readonly string[]
}

/**
 * Metadata added by the server to streamed assistant messages.
 * This type is intentionally client-safe (no backend runtime imports).
 */
export type ChatMessageMetadata = {
  readonly threadId?: string
  readonly requestId?: string
  readonly model?: string
  readonly modelSource?: 'thread' | 'request'
  readonly startedAt?: number
  readonly completedAt?: number
  readonly totalTokens?: number
  readonly attachments?: readonly ChatAttachment[]
  readonly localListener?: LocalListenerMessageMetadata
}
