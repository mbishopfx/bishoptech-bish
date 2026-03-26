import { describe, expect, it } from 'vitest'
import {
  buildRenderableHistoryItems,
} from './chat-sidebar-history-items'
import type { HistoryVirtualItem } from './chat-sidebar-history-items'

type ThreadRow = {
  readonly threadId: string
  readonly title: string
  readonly groupKey: string
}

describe('buildRenderableHistoryItems', () => {
  it('keeps unique thread rows, group headers, and loading skeletons in order', () => {
    const rows = new Map<number, ThreadRow>([
      [1, { threadId: 'thread-1', title: 'First', groupKey: 'today' }],
      [2, { threadId: 'thread-2', title: 'Second', groupKey: 'yesterday' }],
    ])
    const virtualItems: HistoryVirtualItem[] = [
      { key: 'skeleton-0', index: 0, start: 0 },
      { key: 'thread-1', index: 1, start: 36 },
      { key: 'thread-2', index: 2, start: 72 },
    ]

    const items = buildRenderableHistoryItems({
      virtualItems,
      rowAt: (index) => rows.get(index),
      getGroupKey: (row) => row.groupKey,
    })

    expect(items).toEqual([
      { kind: 'skeleton', key: 'skeleton-0', start: 0 },
      {
        kind: 'header',
        key: 'header:today:thread-1',
        start: 36,
        groupKey: 'today',
      },
      {
        kind: 'thread',
        key: 'thread-1',
        start: 36,
        thread: { threadId: 'thread-1', title: 'First', groupKey: 'today' },
      },
      {
        kind: 'header',
        key: 'header:yesterday:thread-2',
        start: 72,
        groupKey: 'yesterday',
      },
      {
        kind: 'thread',
        key: 'thread-2',
        start: 72,
        thread: { threadId: 'thread-2', title: 'Second', groupKey: 'yesterday' },
      },
    ])
  })

  it('collapses duplicate permalink rows without duplicating headers', () => {
    const duplicatedThread = {
      threadId: 'thread-error',
      title: 'Errored chat',
      groupKey: 'today',
    }
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
      getGroupKey: (row) => row.groupKey,
    })

    expect(items).toEqual([
      {
        kind: 'header',
        key: 'header:today:thread-error',
        start: 288,
        groupKey: 'today',
      },
      {
        kind: 'thread',
        key: 'thread-error',
        start: 288,
        thread: duplicatedThread,
      },
    ])
  })

  it('emits only the group headers needed for the visible window', () => {
    const rows = new Map<number, ThreadRow>([
      [40, { threadId: 'thread-40', title: 'Current', groupKey: 'last_7_days' }],
      [41, { threadId: 'thread-41', title: 'Next', groupKey: 'last_7_days' }],
      [42, { threadId: 'thread-42', title: 'Older', groupKey: 'last_30_days' }],
    ])
    const virtualItems: HistoryVirtualItem[] = [
      { key: 'thread-40', index: 40, start: 1440 },
      { key: 'thread-41', index: 41, start: 1476 },
      { key: 'thread-42', index: 42, start: 1512 },
    ]

    const items = buildRenderableHistoryItems({
      virtualItems,
      rowAt: (index) => rows.get(index),
      getGroupKey: (row) => row.groupKey,
    })

    expect(items).toEqual([
      {
        kind: 'header',
        key: 'header:last_7_days:thread-40',
        start: 1440,
        groupKey: 'last_7_days',
      },
      {
        kind: 'thread',
        key: 'thread-40',
        start: 1440,
        thread: rows.get(40),
      },
      {
        kind: 'thread',
        key: 'thread-41',
        start: 1476,
        thread: rows.get(41),
      },
      {
        kind: 'header',
        key: 'header:last_30_days:thread-42',
        start: 1512,
        groupKey: 'last_30_days',
      },
      {
        kind: 'thread',
        key: 'thread-42',
        start: 1512,
        thread: rows.get(42),
      },
    ])
  })
})
