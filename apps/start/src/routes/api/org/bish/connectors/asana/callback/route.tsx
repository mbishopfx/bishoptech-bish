import { createFileRoute } from '@tanstack/react-router'
import {
  buildConnectorCallbackErrorRedirect,
  completeConnectorOAuthCallback,
} from '@/lib/backend/bish/connector-auth'

export const Route = createFileRoute('/api/org/bish/connectors/asana/callback')({
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
            provider: 'asana',
            state,
            message:
              providerErrorDescription
              || providerError
              || 'Asana did not return a valid authorization code.',
          })
          return Response.redirect(redirectUrl, 302)
        }

        try {
          const redirectUrl = await completeConnectorOAuthCallback({
            provider: 'asana',
            requestUrl: request.url,
            state,
            code,
          })
          return Response.redirect(redirectUrl, 302)
        } catch (error) {
          const redirectUrl = await buildConnectorCallbackErrorRedirect({
            requestUrl: request.url,
            provider: 'asana',
            state,
            message:
              error instanceof Error ? error.message : 'Asana connection failed.',
          })
          return Response.redirect(redirectUrl, 302)
        }
      },
    },
  },
})

