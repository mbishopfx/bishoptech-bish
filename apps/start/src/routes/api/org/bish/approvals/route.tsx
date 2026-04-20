import { createFileRoute } from '@tanstack/react-router'
import {
  createApprovalRequestInput,
  resolveApprovalRequestInput,
} from '@/lib/shared/bish'
import {
  createApprovalRequestForOrganization,
  getOrganizationControlPlaneSnapshot,
  resolveApprovalRequestForOrganization,
} from '@/lib/backend/bish/repository'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/approvals')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const payload = await getOrganizationControlPlaneSnapshot(
            context.organizationId,
          )
          return Response.json(payload.approvals)
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

          if (body?.approvalRequestId) {
            const parsed = resolveApprovalRequestInput.parse(body)
            await resolveApprovalRequestForOrganization(
              context.organizationId,
              context.userId,
              parsed,
            )
          } else {
            const parsed = createApprovalRequestInput.parse(body)
            await createApprovalRequestForOrganization(
              context.organizationId,
              context.userId,
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
