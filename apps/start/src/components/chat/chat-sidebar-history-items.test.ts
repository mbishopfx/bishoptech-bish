import { describe, expect, it } from 'vitest'
import {
  buildRenderableHistoryItems,
} from './chat-sidebar-history-items'
import type { HistoryVirtualItem } from './chat-sidebar-history-items'

type ThreadRow = {
  readonly threadId: string
  readonly title: string
}

describe('buildRenderableHistoryItems', () => {
  it('keeps unique thread rows and loading skeletons in order', () => {
    const rows = new Map<number, ThreadRow>([
      [1, { threadId: 'thread-1', title: 'First' }],
      [2, { threadId: 'thread-2', title: 'Second' }],
    ])
    const virtualItems: HistoryVirtualItem[] = [
      { key: 'skeleton-0', index: 0, start: 0 },
      { key: 'thread-1', index: 1, start: 36 },
      { key: 'thread-2', index: 2, start: 72 },
    ]

    const items = buildRenderableHistoryItems({
      virtualItems,
      rowAt: (index) => rows.get(index),
    })

    expect(items).toEqual([
      { kind: 'skeleton', key: 'skeleton-0', start: 0 },
      {
        kind: 'thread',
        key: 'thread-1',
        start: 36,
        thread: { threadId: 'thread-1', title: 'First' },
      },
      {
        kind: 'thread',
        key: 'thread-2',
        start: 72,
        thread: { threadId: 'thread-2', title: 'Second' },
      },
    ])
  })

  it('collapses duplicate permalink rows to a single rendered thread', () => {
    const duplicatedThread = { threadId: 'thread-error', title: 'Errored chat' }
    const rows = new Map<number, ThreadRow>([
      [8, duplicatedThread],
      [9, duplicatedThread],
      [10, duplicatedThread],
    ])
    const virtualItems: HistoryVirtualItem[] = [
      { key: 'dup-a', index: 8, start: 288 },
      { key: 'dup-b', index: 9, start: 324 },
      { key: 'dup-c', index: 10, start: 360 },
    ]

    const items = buildRenderableHistoryItems({
      virtualItems,
      rowAt: (index) => rows.get(index),
    })

    expect(items).toEqual([
      {
        kind: 'thread',
        key: 'thread-error',
        start: 288,
        thread: duplicatedThread,
      },
    ])
  })
})
