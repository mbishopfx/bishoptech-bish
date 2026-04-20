import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { createOrRotateLocalListenerSecret } from '@/lib/backend/bish/local-listener'
import { requireBishOperatorRequestContext } from '@/lib/backend/bish/request-context'

const operatorListenerSecretInput = z.object({
  organizationId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(2).max(80).default('Primary Listener'),
})

/**
 * Temporary operator-only bootstrap route so listener rollout is not blocked on
 * waiting for the approvals page UX to be visible in production. The secret is
 * returned once and never persisted in plaintext.
 */
export const Route = createFileRoute('/api/operator/bish/listener-secret')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const operator = await requireBishOperatorRequestContext(request.headers)
          const rawBody = await request.text()
          const body = rawBody ? JSON.parse(rawBody) : {}
          const input = operatorListenerSecretInput.parse(body)

          const result = await createOrRotateLocalListenerSecret({
            organizationId: input.organizationId ?? operator.organizationId,
            data: {
              label: input.label,
            },
          })

          return Response.json({
            organizationId: input.organizationId ?? operator.organizationId,
            listenerId: result.listenerId,
            secret: result.secret,
          })
        } catch (error) {
          const status =
            error instanceof Error && error.message === 'Operator access required'
              ? 401
              : 400

          return Response.json(
            { error: error instanceof Error ? error.message : 'Unexpected error' },
            { status },
          )
        }
      },
    },
  },
})
