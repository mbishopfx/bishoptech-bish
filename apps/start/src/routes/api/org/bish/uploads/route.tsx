import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { isOrgAdmin } from '@/lib/backend/auth/services/organization-member-role.service'
import { OrgKnowledgeUnauthorizedError } from '@/lib/backend/org-knowledge/domain/errors'
import { OrgKnowledgeRuntime } from '@/lib/backend/org-knowledge/runtime/org-knowledge-runtime'
import { OrgKnowledgeAdminService } from '@/lib/backend/org-knowledge/services/org-knowledge-admin.service'
import { requireOrgAuth } from '@/lib/backend/server-effect/http/server-auth'

export const Route = createFileRoute('/api/org/bish/uploads')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID()

        try {
          const authContext = await OrgKnowledgeRuntime.run(
            Effect.gen(function* () {
              return yield* requireOrgAuth({
                headers: request.headers,
                onUnauthorized: () =>
                  new OrgKnowledgeUnauthorizedError({
                    message: 'Unauthorized',
                    requestId,
                  }),
                onMissingOrg: () =>
                  new OrgKnowledgeUnauthorizedError({
                    message: 'Organization context is required',
                    requestId,
                  }),
              })
            }),
          )

          const allowed = await isOrgAdmin({
            headers: request.headers,
            organizationId: authContext.organizationId,
          })
          if (!allowed) {
            throw new OrgKnowledgeUnauthorizedError({
              message: 'Only organization admins can upload shared knowledge.',
              requestId,
            })
          }

          const formData = await request.formData()
          const file = formData.get('file')
          if (!(file instanceof File)) {
            return Response.json({ error: 'A file field is required.' }, { status: 400 })
          }

          const payload = await OrgKnowledgeRuntime.run(
            Effect.gen(function* () {
              const service = yield* OrgKnowledgeAdminService
              return yield* service.uploadKnowledgeFile({
                organizationId: authContext.organizationId,
                userId: authContext.userId,
                file,
                requestId,
              })
            }),
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
