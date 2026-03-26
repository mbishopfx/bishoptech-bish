import type { Key } from 'react'

type ThreadIdentity = {
  readonly threadId: string
}

export type HistoryVirtualItem = {
  readonly key: Key
  readonly index: number
  readonly start: number
}

export type RenderableHistoryItem<TRow extends ThreadIdentity> =
  | {
      readonly kind: 'skeleton'
      readonly key: Key
      readonly start: number
    }
  | {
      readonly kind: 'thread'
      readonly key: string
      readonly start: number
      readonly thread: TRow
    }
  | {
      readonly kind: 'header'
      readonly key: string
      readonly start: number
      readonly groupKey: string
    }

/**
 * `useZeroVirtualizer` can briefly surface the permalink row alongside its
 * neighboring page windows while a thread-focused sidebar view is restoring.
 * Rendering those duplicate materializations produces stacked copies of the
 * same thread row, so the sidebar collapses them by `threadId` before render.
 */
export function buildRenderableHistoryItems<TRow extends ThreadIdentity>({
  virtualItems,
  rowAt,
  getGroupKey,
}: {
  virtualItems: readonly HistoryVirtualItem[]
  rowAt: (index: number) => TRow | undefined
  getGroupKey: (row: TRow) => string
}): RenderableHistoryItem<TRow>[] {
  const seenThreadIds = new Set<string>()
  const visibleGroupKeys = new Set<string>()
  const renderableItems: RenderableHistoryItem<TRow>[] = []

  for (const virtualItem of virtualItems) {
    const thread = rowAt(virtualItem.index)
    if (!thread) {
      renderableItems.push({
        kind: 'skeleton',
        key: virtualItem.key,
        start: virtualItem.start,
      })
      continue
    }

    if (seenThreadIds.has(thread.threadId)) {
      continue
    }

    seenThreadIds.add(thread.threadId)
    const groupKey = getGroupKey(thread)
    if (!visibleGroupKeys.has(groupKey)) {
      visibleGroupKeys.add(groupKey)
      renderableItems.push({
        kind: 'header',
        key: `header:${groupKey}:${thread.threadId}`,
        start: virtualItem.start,
        groupKey,
      })
    }

    renderableItems.push({
      kind: 'thread',
      key: thread.threadId,
      start: virtualItem.start,
      thread,
    })
  }

  return renderableItems
}
