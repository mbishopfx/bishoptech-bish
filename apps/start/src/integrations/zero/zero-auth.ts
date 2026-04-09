import type { ZeroContext } from './schema'

export type ZeroAuthSnapshot = {
  readonly userID: string
  readonly context: ZeroContext
}

export function resolveZeroAuthSnapshot(input: {
  readonly userId?: string | null
  readonly isAnonymous: boolean
  readonly activeOrganizationId?: string | null
  readonly loading: boolean
  readonly lastSnapshot?: ZeroAuthSnapshot | null
}): {
  readonly ready: boolean
  readonly snapshot?: ZeroAuthSnapshot
} {
  const userId = input.userId?.trim()
  const organizationId = input.activeOrganizationId?.trim()

  if (userId) {
    const context: ZeroContext = organizationId
      ? { userID: userId, organizationId, isAnonymous: input.isAnonymous }
      : { userID: userId, isAnonymous: input.isAnonymous }

    return {
      ready: true,
      snapshot: {
        userID: userId,
        context,
      },
    }
  }

  if (input.loading && input.lastSnapshot) {
    return { ready: true, snapshot: input.lastSnapshot }
  }

  return { ready: false }
}
