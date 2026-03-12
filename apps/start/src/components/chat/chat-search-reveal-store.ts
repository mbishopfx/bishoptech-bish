export type ChatSearchRevealRequest = {
  readonly threadId: string
  readonly messageId: string
  readonly query: string
  readonly nonce: string
}

type RevealListener = () => void

let pendingReveal: ChatSearchRevealRequest | null = null
const listeners = new Set<RevealListener>()

function emitRevealChange() {
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Stores the latest command-search reveal request in transient memory only.
 * This keeps reveal/highlight behavior scoped to command navigation and avoids
 * replaying it after a full page reload.
 */
export function setPendingChatSearchReveal(reveal: ChatSearchRevealRequest) {
  pendingReveal = reveal
  emitRevealChange()
}

export function getPendingChatSearchReveal(): ChatSearchRevealRequest | null {
  return pendingReveal
}

export function clearPendingChatSearchReveal() {
  if (!pendingReveal) return
  pendingReveal = null
  emitRevealChange()
}

export function subscribeToChatSearchReveal(listener: RevealListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
