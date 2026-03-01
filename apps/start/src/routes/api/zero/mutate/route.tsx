import { createFileRoute } from '@tanstack/react-router'
import { PushProcessor } from '@rocicorp/zero/server'
import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg'
import { Effect } from 'effect'
import { Pool } from 'pg'
import { getAuth } from '@workos/authkit-tanstack-react-start'
import { schema } from '@/integrations/zero/schema'
import { mutators } from '@/integrations/zero/mutators'
import type { ZeroContext } from '@/integrations/zero/schema'
import { emitWideErrorEvent } from '@/lib/chat-backend/observability/wide-event'
import { ChatErrorCode } from '@/lib/chat-contracts/error-codes'

/**
 * Zero mutate endpoint. zero-cache calls this to run mutators against Postgres.
 * Requires cookie auth: set ZERO_MUTATE_FORWARD_COOKIES=true on zero-cache so
 * the session cookie is forwarded; we derive userID from getAuth(), not from headers.
 */
const connectionString = process.env.ZERO_UPSTREAM_DB
const pool = connectionString ? new Pool({ connectionString }) : null
const dbProvider = pool ? zeroNodePg(schema, pool) : null

function containsBranchVersionConflict(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('branch_version_conflict')
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsBranchVersionConflict(entry))
  }
  if (!value || typeof value !== 'object') {
    return false
  }
  return Object.values(value).some((entry) =>
    containsBranchVersionConflict(entry),
  )
}

export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!dbProvider) {
          return new Response(
            JSON.stringify({
              kind: 'PushFailed',
              message: 'ZERO_UPSTREAM_DB not configured',
              mutationIDs: [],
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          )
        }
        const auth = await getAuth()
        const { user } = auth
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          )
        }
        const organizationId =
          'organizationId' in auth && typeof auth.organizationId === 'string'
            ? auth.organizationId
            : undefined
        const context: ZeroContext = {
          userID: user.id,
          orgWorkosId: organizationId?.trim() || undefined,
        }
        const requestId =
          request.headers.get('x-request-id') ?? crypto.randomUUID()
        const processor = new PushProcessor(dbProvider, context, 'error')
        const result = await processor.process(mutators, request)
        if (containsBranchVersionConflict(result)) {
          await Effect.runPromise(
            Effect.gen(function* () {
              yield* Effect.annotateLogs(
                Effect.logWarning('zero_mutate_branch_version_conflict'),
                {
                  route: '/api/zero/mutate',
                  request_id: requestId,
                  user_id: user.id,
                },
              )
              yield* emitWideErrorEvent({
                eventName: 'chat.branch.version.conflict',
                route: '/api/zero/mutate',
                requestId,
                userId: user.id,
                errorCode: ChatErrorCode.BranchVersionConflict,
                errorTag: 'BranchVersionConflictError',
                message: 'branch_version_conflict',
                retryable: true,
                cause: 'zero_mutator_threads.selectBranchChild',
              })
            }),
          )
        }
        const failed =
          'kind' in result &&
          (result as { kind: string }).kind === 'PushFailed'
        const reason =
          failed && 'reason' in result
            ? (result as { reason: string }).reason
            : undefined
        const status = failed
          ? reason === 'Parse' || reason === 'UnsupportedPushVersion'
            ? 400
            : 500
          : 200
        return new Response(JSON.stringify(result), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
