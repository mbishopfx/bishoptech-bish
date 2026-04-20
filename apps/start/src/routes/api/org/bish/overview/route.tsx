import { createFileRoute } from '@tanstack/react-router'
import { getOrganizationControlPlaneSnapshot } from '@/lib/backend/bish/repository'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/overview')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const payload = await getOrganizationControlPlaneSnapshot(
            context.organizationId,
          )
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
