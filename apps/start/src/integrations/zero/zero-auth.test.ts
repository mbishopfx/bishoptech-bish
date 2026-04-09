import { describe, expect, it } from 'vitest'
import { resolveZeroAuthSnapshot } from './zero-auth'

describe('resolveZeroAuthSnapshot', () => {
  it('waits for guest bootstrap when no authenticated user exists yet', () => {
    expect(
      resolveZeroAuthSnapshot({
        userId: null,
        isAnonymous: false,
        activeOrganizationId: null,
        loading: false,
        lastSnapshot: null,
      }),
    ).toEqual({ ready: false })
  })

  it('builds a personal guest snapshot without forcing an organization id', () => {
    expect(
      resolveZeroAuthSnapshot({
        userId: 'guest-user',
        isAnonymous: true,
        activeOrganizationId: null,
        loading: false,
        lastSnapshot: null,
      }),
    ).toEqual({
      ready: true,
      snapshot: {
        userID: 'guest-user',
        context: {
          userID: 'guest-user',
          isAnonymous: true,
        },
      },
    })
  })

  it('reuses the last resolved snapshot while auth is still hydrating', () => {
    expect(
      resolveZeroAuthSnapshot({
        userId: null,
        isAnonymous: false,
        activeOrganizationId: null,
        loading: true,
        lastSnapshot: {
          userID: 'persisted-user',
          context: {
            userID: 'persisted-user',
            organizationId: 'org_123',
            isAnonymous: false,
          },
        },
      }),
    ).toEqual({
      ready: true,
      snapshot: {
        userID: 'persisted-user',
        context: {
          userID: 'persisted-user',
          organizationId: 'org_123',
          isAnonymous: false,
        },
      },
    })
  })
})
