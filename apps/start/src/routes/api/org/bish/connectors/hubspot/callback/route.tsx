import { createFileRoute } from '@tanstack/react-router'
import {
  buildConnectorCallbackErrorRedirect,
  completeConnectorOAuthCallback,
} from '@/lib/backend/bish/connector-auth'

export const Route = createFileRoute('/api/org/bish/connectors/hubspot/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')?.trim()
        const state = url.searchParams.get('state')?.trim()
        const providerError = url.searchParams.get('error')?.trim()
        const providerErrorDescription =
          url.searchParams.get('error_description')?.trim()

        if (!code || !state || providerError) {
          const redirectUrl = await buildConnectorCallbackErrorRedirect({
            requestUrl: request.url,
            provider: 'hubspot',
            state,
            message:
              providerErrorDescription
              || providerError
              || 'HubSpot did not return a valid authorization code.',
          })
          return Response.redirect(redirectUrl, 302)
        }

        try {
          const redirectUrl = await completeConnectorOAuthCallback({
            provider: 'hubspot',
            requestUrl: request.url,
            state,
            code,
          })
          return Response.redirect(redirectUrl, 302)
        } catch (error) {
          const redirectUrl = await buildConnectorCallbackErrorRedirect({
            requestUrl: request.url,
            provider: 'hubspot',
            state,
            message:
              error instanceof Error ? error.message : 'HubSpot connection failed.',
          })
          return Response.redirect(redirectUrl, 302)
        }
      },
    },
  },
})

