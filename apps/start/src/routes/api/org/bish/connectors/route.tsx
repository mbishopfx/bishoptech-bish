import { createFileRoute } from '@tanstack/react-router'
import {
  createConnectorAccountInput,
  scheduleConnectorSyncInput,
} from '@/lib/shared/bish'
import {
  createConnectorAccountForOrganization,
  getOrganizationControlPlaneSnapshot,
  scheduleConnectorSyncForOrganization,
} from '@/lib/backend/bish/repository'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/connectors')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const payload = await getOrganizationControlPlaneSnapshot(
            context.organizationId,
          )
          return Response.json(payload.connectors)
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unexpected error' },
            { status: 401 },
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const body = await request.json()

          if (body?.action === 'schedule_sync') {
            const parsed = scheduleConnectorSyncInput.parse(body)
            await scheduleConnectorSyncForOrganization(
              context.organizationId,
              parsed,
            )
          } else {
            const parsed = createConnectorAccountInput.parse(body)
            await createConnectorAccountForOrganization(
              context.organizationId,
              parsed,
            )
          }

          const payload = await getOrganizationControlPlaneSnapshot(
            context.organizationId,
          )
          return Response.json(payload)
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Unexpected error' },
            { status: 400 },
          )
        }
      },
    },
  },
})
