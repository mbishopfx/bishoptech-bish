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

function trimBoundarySkeletons<TRow extends ThreadIdentity>(
  items: readonly RenderableHistoryItem<TRow>[],
): RenderableHistoryItem<TRow>[] {
  let startIndex = 0
  let endIndex = items.length

  while (startIndex < endIndex && items[startIndex]?.kind === 'skeleton') {
    startIndex += 1
  }

  while (
    endIndex > startIndex
    && items[endIndex - 1]?.kind === 'skeleton'
  ) {
    endIndex -= 1
  }

  return startIndex === 0 && endIndex === items.length
    ? [...items]
    : items.slice(startIndex, endIndex)
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

  return renderableItems.some((item) => item.kind === 'thread')
    ? trimBoundarySkeletons(renderableItems)
    : renderableItems
}

export function resolveRenderableHistoryGroups<TGroupKey extends string>({
  orderedGroupKeys,
  discoveredGroupKeys,
  visibleGroupKeys,
}: {
  orderedGroupKeys: readonly TGroupKey[]
  discoveredGroupKeys: readonly TGroupKey[]
  visibleGroupKeys: readonly TGroupKey[]
}): TGroupKey[] {
  if (visibleGroupKeys.length === 0) {
    return []
  }

  const visibleGroupKeySet = new Set(visibleGroupKeys)
  const discoveredGroupKeySet = new Set(discoveredGroupKeys)
  let lastVisibleGroupIndex = -1

  orderedGroupKeys.forEach((groupKey, index) => {
    if (visibleGroupKeySet.has(groupKey)) {
      lastVisibleGroupIndex = index
    }
  })

  if (lastVisibleGroupIndex === -1) {
    return []
  }

  return orderedGroupKeys.filter(
    (groupKey, index) =>
      index <= lastVisibleGroupIndex
      && (visibleGroupKeySet.has(groupKey) || discoveredGroupKeySet.has(groupKey)),
  )
}
