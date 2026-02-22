type ThreadGenerationStatus =
  | 'pending'
  | 'generation'
  | 'completed'
  | 'failed'
  | undefined

const threadStatuses = new Map<string, ThreadGenerationStatus>()
const listeners = new Set<() => void>()
let version = 0

function notify() {
  version += 1
  for (const listener of listeners) {
    listener()
  }
}

export function syncThreadGenerationStatuses(
  threads: readonly { threadId: string; generationStatus?: ThreadGenerationStatus }[],
) {
  threadStatuses.clear()
  for (const thread of threads) {
    threadStatuses.set(thread.threadId, thread.generationStatus)
  }
  notify()
}

export function getThreadGenerationStatus(
  threadId: string | undefined,
): ThreadGenerationStatus {
  if (!threadId) return undefined
  return threadStatuses.get(threadId)
}

export function subscribeThreadStatuses(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getThreadStatusesVersion(): number {
  return version
}
