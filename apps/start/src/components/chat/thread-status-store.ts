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
  threads: readonly {
    threadId: string
    generationStatus?: ThreadGenerationStatus
  }[],
) {
  let changed = false
  const nextThreadIds = new Set<string>()

  for (const thread of threads) {
    nextThreadIds.add(thread.threadId)
    const nextStatus = thread.generationStatus
    const currentStatus = threadStatuses.get(thread.threadId)

    if (currentStatus === nextStatus) continue
    threadStatuses.set(thread.threadId, nextStatus)
    changed = true
  }

  for (const existingThreadId of Array.from(threadStatuses.keys())) {
    if (nextThreadIds.has(existingThreadId)) continue
    threadStatuses.delete(existingThreadId)
    changed = true
  }

  if (!changed) {
    return
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
