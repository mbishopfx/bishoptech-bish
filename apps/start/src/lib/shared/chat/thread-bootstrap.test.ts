import { describe, expect, it } from 'vitest'
import {
  buildBootstrapThreadRecord,
  DEFAULT_THREAD_TITLE,
} from './thread-bootstrap'

describe('buildBootstrapThreadRecord', () => {
  it('builds the canonical deterministic bootstrap row shape', () => {
    const record = buildBootstrapThreadRecord({
      threadId: 'thread-1',
      createdAt: 123,
      userId: 'user-1',
      modelId: 'openai/gpt-5-mini',
      modeId: 'study',
      contextWindowMode: 'max',
      organizationId: 'org-1',
      disabledToolKeys: ['tool-a', 'tool-a', 'tool-b'],
    })

    expect(record).toEqual({
      id: 'thread-1',
      threadId: 'thread-1',
      title: DEFAULT_THREAD_TITLE,
      createdAt: 123,
      updatedAt: 123,
      lastMessageAt: 123,
      generationStatus: 'pending',
      visibility: 'visible',
      userSetTitle: false,
      userId: 'user-1',
      model: 'openai/gpt-5-mini',
      reasoningEffort: undefined,
      modeId: 'study',
      contextWindowMode: 'max',
      pinned: false,
      allowAttachments: true,
      activeChildByParent: {},
      branchVersion: 1,
      ownerOrgId: 'org-1',
      disabledToolKeys: ['tool-a', 'tool-b'],
    })
  })

  it('drops invalid mode ids and normalizes empty organization ids', () => {
    const record = buildBootstrapThreadRecord({
      threadId: 'thread-2',
      createdAt: 456,
      userId: 'user-2',
      modelId: 'anthropic/claude-opus-4.1',
      modeId: 'not-a-real-mode',
      organizationId: '   ',
    })

    expect(record.modeId).toBeUndefined()
    expect(record.ownerOrgId).toBeUndefined()
    expect(record.contextWindowMode).toBe('standard')
  })
})
