/**
 * Shared contracts for command-palette chat search.
 *
 * Keep this shape small and stable so the UI can render rich results without
 * needing to fetch full threads or full message payloads for every keystroke.
 */
export type ChatSearchMatchType = 'title' | 'message'

export const CHAT_SEARCHABLE_MESSAGE_ROLES = ['user', 'assistant'] as const
export const CHAT_SEARCHABLE_MESSAGE_STATUS = 'done' as const

export type ChatSearchResult = {
  /** Public route identifier for the matching thread. */
  readonly threadId: string
  /** Public message identifier when the hit came from message content. */
  readonly messageId?: string
  /** User-facing thread title shown in the command list. */
  readonly threadTitle: string
  /** Compact snippet that explains why the result matched. */
  readonly snippet?: string
  /** Distinguishes title hits from message-content hits. */
  readonly matchType: ChatSearchMatchType
  /** Timestamp used for result ordering and date display in the command UI. */
  readonly matchedAt: number
}
