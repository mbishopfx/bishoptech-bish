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

  for (const thread of threads) {
    const nextStatus = thread.generationStatus
    const currentStatus = threadStatuses.get(thread.threadId)

    if (currentStatus === nextStatus) continue
    if (nextStatus === undefined) {
      threadStatuses.delete(thread.threadId)
    } else {
      threadStatuses.set(thread.threadId, nextStatus)
    }
    changed = true
  }

  if (!changed) {
    return
  }

  notify()
}

/**
 * Updates a single thread status without clearing the rest of the store.
 * This is used by focused thread queries so deep-link navigation can still
 * resume generation even when the sidebar only has a virtualized subset loaded.
 */
export function setThreadGenerationStatus(
  threadId: string,
  generationStatus: ThreadGenerationStatus,
) {
  const currentStatus = threadStatuses.get(threadId)
  if (currentStatus === generationStatus) {
    return
  }

  if (generationStatus === undefined) {
    threadStatuses.delete(threadId)
  } else {
    threadStatuses.set(threadId, generationStatus)
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
