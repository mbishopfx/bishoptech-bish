import { createFileRoute } from '@tanstack/react-router'
import { beginConnectorAuthFlow } from '@/lib/backend/bish/connector-auth'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/connectors/google-workspace/activate')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const url = new URL(request.url)
          const connectorAccountId = url.searchParams.get('connectorAccountId')?.trim()

          if (!connectorAccountId) {
            return Response.redirect(
              new URL(
                '/organization/settings/connectors?connectorAuth=error&provider=google_workspace&message=Missing%20connector%20account',
                request.url,
              ),
              302,
            )
          }

          await beginConnectorAuthFlow({
            organizationId: context.organizationId,
            userId: context.userId,
            connectorAccountId,
          })

          return Response.redirect(
            new URL(
              '/organization/settings/connectors?connectorAuth=success&provider=google_workspace',
              request.url,
            ),
            302,
          )
        } catch (error) {
          const message =
            error instanceof Error ? encodeURIComponent(error.message) : 'Unexpected%20error'
          return Response.redirect(
            new URL(
              `/organization/settings/connectors?connectorAuth=error&provider=google_workspace&message=${message}`,
              request.url,
            ),
            302,
          )
        }
      },
    },
  },
})

