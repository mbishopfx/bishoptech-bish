import { createFileRoute } from '@tanstack/react-router'
import {
  createCandidateVariantInput,
  promoteCandidateVariantInput,
} from '@/lib/shared/bish'
import {
  createCandidateVariantForOrganization,
  getOrganizationControlPlaneSnapshot,
  promoteCandidateVariantForOrganization,
} from '@/lib/backend/bish/repository'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/evolution')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const payload = await getOrganizationControlPlaneSnapshot(
            context.organizationId,
          )
          return Response.json({
            agents: payload.agents,
            candidates: payload.candidates,
          })
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

          if (body?.candidateVariantId) {
            const parsed = promoteCandidateVariantInput.parse(body)
            await promoteCandidateVariantForOrganization(
              context.organizationId,
              context.userId,
              parsed,
            )
          } else {
            const parsed = createCandidateVariantInput.parse(body)
            await createCandidateVariantForOrganization(
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
