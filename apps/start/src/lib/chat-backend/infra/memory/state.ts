import type { UIMessage } from 'ai'
import type { ChatModeId } from '@/lib/chat-modes'

// In-memory state used for local development and tests until DB wiring lands.
type ThreadRecord = {
  readonly threadId: string
  readonly userId: string
  readonly createdAt: number
  modelId: string
  updatedAt: number
  modeId?: ChatModeId
  disabledToolKeys?: readonly string[]
}

type RateLimitBucket = {
  windowStartMs: number
  hits: number
}

const state = {
  threads: new Map<string, ThreadRecord>(),
  messages: new Map<string, UIMessage[]>(),
  rateLimits: new Map<string, RateLimitBucket>(),
}

export function getMemoryState() {
  return state
}
