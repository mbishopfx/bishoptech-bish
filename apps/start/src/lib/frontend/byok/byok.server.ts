import { getRequestHeaders } from '@tanstack/react-start/server'
import { Effect } from 'effect'
import { runUpdateByok } from '@/lib/backend/byok/byok-runner'
import {
  ByokForbiddenError,
  ByokMissingOrgContextError,
  ByokUnauthorizedError,
} from '@/lib/backend/byok/domain/errors'
import { authPool } from '@/lib/backend/auth/auth-pool'
import { requireOrgAuth } from '@/lib/backend/server-effect/http/server-auth'
import { isAdminRole } from '@/lib/shared/auth/roles'

/**
 * Server-side BYOK mutation entrypoint.
 */
export async function updateByokAction(input: {
  readonly data: unknown
}) {
  const headers = getRequestHeaders()
  const authContext = await Effect.runPromise(
    requireOrgAuth({
      headers,
      onUnauthorized: () =>
        new ByokUnauthorizedError({
          message: 'Unauthorized',
        }),
      onMissingOrg: () =>
        new ByokMissingOrgContextError({
          message: 'No active workspace selected',
        }),
    }),
  )

  const memberResult = await authPool.query<{ role: string }>(
    `select role
     from member
     where "organizationId" = $1
       and "userId" = $2
     limit 1`,
    [authContext.organizationId, authContext.userId],
  )

  const role = memberResult.rows[0]?.role
  if (!role || !isAdminRole(role)) {
    throw new ByokForbiddenError({
      message: 'Only workspace owners or admins can manage BYOK keys.',
    })
  }

  return runUpdateByok({
    organizationId: authContext.organizationId,
    data: input.data,
  })
}
