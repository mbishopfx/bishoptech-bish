import { describe, expect, it } from 'vitest'
import {
  getThreadGenerationStatus,
  setThreadGenerationStatus,
  syncThreadGenerationStatuses,
} from './thread-status-store'

describe('thread-status-store', () => {
  it('preserves focused thread status updates when a virtualized batch syncs another slice', () => {
    setThreadGenerationStatus('deep-linked-thread', 'generation')

    syncThreadGenerationStatuses([
      { threadId: 'visible-thread', generationStatus: 'pending' },
    ])

    expect(getThreadGenerationStatus('deep-linked-thread')).toBe('generation')
    expect(getThreadGenerationStatus('visible-thread')).toBe('pending')
  })

  it('prunes threads when their status becomes undefined', () => {
    setThreadGenerationStatus('ephemeral-thread', 'pending')
    expect(getThreadGenerationStatus('ephemeral-thread')).toBe('pending')

    setThreadGenerationStatus('ephemeral-thread', undefined)
    expect(getThreadGenerationStatus('ephemeral-thread')).toBeUndefined()

    syncThreadGenerationStatuses([
      { threadId: 'synced-thread', generationStatus: 'generation' },
      { threadId: 'synced-thread', generationStatus: undefined },
    ])
    expect(getThreadGenerationStatus('synced-thread')).toBeUndefined()
  })
})
