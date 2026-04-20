import { createFileRoute } from '@tanstack/react-router'
import { buildGooglePickerAuthUrl } from '@/lib/backend/bish/google-picker'
import { requireBishOrgRequestContext } from '@/lib/backend/bish/request-context'

export const Route = createFileRoute('/api/org/knowledge/google/start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireBishOrgRequestContext(request.headers)
          const url = new URL(request.url)
          const returnTo = url.searchParams.get('returnTo')
          const redirectUrl = buildGooglePickerAuthUrl({
            organizationId: context.organizationId,
            userId: context.userId,
            returnTo,
          })
          return Response.redirect(redirectUrl, 302)
        } catch (error) {
          const message =
            error instanceof Error ? encodeURIComponent(error.message) : 'Unexpected%20error'
          return Response.redirect(
            new URL(
              `/organization/settings/knowledge?googlePicker=error&message=${message}`,
              request.url,
            ),
            302,
          )
        }
      },
    },
  },
})
