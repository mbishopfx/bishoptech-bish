import { describe, expect, it } from 'vitest'
import {
  resolveCanonicalBranch,
  resolveRegenerationAnchor,
} from './branch-resolver'

type TestMessage = {
  messageId: string
  role: 'user' | 'assistant' | 'system'
  parentMessageId?: string
  branchIndex?: number
  createdAt?: number
}

describe('branch-resolver', () => {
  it('resolves a linear canonical path', () => {
    const messages: TestMessage[] = [
      { messageId: 'u1', role: 'user', createdAt: 1 },
      { messageId: 'a1', role: 'assistant', parentMessageId: 'u1', createdAt: 2 },
      { messageId: 'u2', role: 'user', parentMessageId: 'a1', createdAt: 3 },
      { messageId: 'a2', role: 'assistant', parentMessageId: 'u2', createdAt: 4 },
    ]

    const resolution = resolveCanonicalBranch(messages, {
      u1: 'a1',
      a1: 'u2',
      u2: 'a2',
    })

    expect(resolution.canonicalMessageIds).toEqual(['u1', 'a1', 'u2', 'a2'])
  })

  it('chooses selected assistant branch under a user anchor', () => {
    const messages: TestMessage[] = [
      { messageId: 'u1', role: 'user', createdAt: 1 },
      {
        messageId: 'a1-v1',
        role: 'assistant',
        parentMessageId: 'u1',
        branchIndex: 1,
        createdAt: 2,
      },
      {
        messageId: 'a1-v2',
        role: 'assistant',
        parentMessageId: 'u1',
        branchIndex: 2,
        createdAt: 3,
      },
    ]

    const resolution = resolveCanonicalBranch(messages, { u1: 'a1-v1' })

    expect(resolution.canonicalMessageIds).toEqual(['u1', 'a1-v1'])
    expect(resolution.branchOptionsByParent.u1).toEqual(['a1-v1', 'a1-v2'])
  })

  it('handles nested branch selections deterministically', () => {
    const messages: TestMessage[] = [
      { messageId: 'u1', role: 'user', createdAt: 1 },
      { messageId: 'a1-v1', role: 'assistant', parentMessageId: 'u1', branchIndex: 1, createdAt: 2 },
      { messageId: 'a1-v2', role: 'assistant', parentMessageId: 'u1', branchIndex: 2, createdAt: 3 },
      { messageId: 'u2-v2', role: 'user', parentMessageId: 'a1-v2', branchIndex: 1, createdAt: 4 },
      { messageId: 'a2-v1', role: 'assistant', parentMessageId: 'u2-v2', branchIndex: 1, createdAt: 5 },
      { messageId: 'a2-v2', role: 'assistant', parentMessageId: 'u2-v2', branchIndex: 2, createdAt: 6 },
    ]

    const resolution = resolveCanonicalBranch(messages, {
      u1: 'a1-v2',
      'a1-v2': 'u2-v2',
      'u2-v2': 'a2-v2',
    })

    expect(resolution.canonicalMessageIds).toEqual(['u1', 'a1-v2', 'u2-v2', 'a2-v2'])
    expect(resolution.branchOptionsByParent.u1).toEqual(['a1-v1', 'a1-v2'])
    expect(resolution.branchOptionsByParent['u2-v2']).toEqual(['a2-v1', 'a2-v2'])
  })

  it('truncates canonical path when anchor child selection is removed', () => {
    const messages: TestMessage[] = [
      { messageId: 'u1', role: 'user', createdAt: 1 },
      { messageId: 'a1', role: 'assistant', parentMessageId: 'u1', branchIndex: 1, createdAt: 2 },
      { messageId: 'u2', role: 'user', parentMessageId: 'a1', branchIndex: 1, createdAt: 3 },
      { messageId: 'a2', role: 'assistant', parentMessageId: 'u2', branchIndex: 1, createdAt: 4 },
    ]

    const full = resolveCanonicalBranch(messages, {
      u1: 'a1',
      a1: 'u2',
      u2: 'a2',
    })
    const truncated = resolveCanonicalBranch(messages, {
      a1: 'u2',
      u2: 'a2',
    })

    expect(full.canonicalMessageIds).toEqual(['u1', 'a1', 'u2', 'a2'])
    expect(truncated.canonicalMessageIds).toEqual(['u1'])
  })

  it('resolves regenerate anchor from user and assistant targets', () => {
    const messages: TestMessage[] = [
      { messageId: 'u1', role: 'user', createdAt: 1 },
      { messageId: 'a1', role: 'assistant', parentMessageId: 'u1', createdAt: 2 },
    ]

    const userTarget = resolveRegenerationAnchor(messages, 'u1')
    const assistantTarget = resolveRegenerationAnchor(messages, 'a1')

    expect(userTarget).toEqual({
      anchorMessageId: 'u1',
      anchorRole: 'user',
      targetMessageId: 'u1',
    })
    expect(assistantTarget).toEqual({
      anchorMessageId: 'u1',
      anchorRole: 'user',
      targetMessageId: 'a1',
    })
  })
})
