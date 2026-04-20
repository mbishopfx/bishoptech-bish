import { createFileRoute } from '@tanstack/react-router'
import { beginConnectorAuthFlow } from '@/lib/backend/bish/connector-auth'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/bish/connectors/asana/start')({
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
                '/organization/settings/connectors?connectorAuth=error&provider=asana&message=Missing%20connector%20account',
                request.url,
              ),
              302,
            )
          }

          const result = await beginConnectorAuthFlow({
            organizationId: context.organizationId,
            userId: context.userId,
            connectorAccountId,
          })

          if (!result.redirectUrl) {
            return Response.redirect(
              new URL(
                '/organization/settings/connectors?connectorAuth=success&provider=asana',
                request.url,
              ),
              302,
            )
          }

          return Response.redirect(result.redirectUrl, 302)
        } catch (error) {
          const message =
            error instanceof Error ? encodeURIComponent(error.message) : 'Unexpected%20error'
          return Response.redirect(
            new URL(
              `/organization/settings/connectors?connectorAuth=error&provider=asana&message=${message}`,
              request.url,
            ),
            302,
          )
        }
      },
    },
  },
})

