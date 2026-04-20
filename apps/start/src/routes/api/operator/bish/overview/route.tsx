import { createFileRoute } from '@tanstack/react-router'
import { getOperatorControlPlaneSnapshot } from '@/lib/backend/bish/repository'
import { requireBishOperatorRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/operator/bish/overview')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireBishOperatorRequestContext(request.headers)
          const payload = await getOperatorControlPlaneSnapshot()
          return Response.json(payload)
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unexpected error' },
            { status: 401 },
          )
        }
      },
    },
  },
})
