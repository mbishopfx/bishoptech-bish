import { createFileRoute } from '@tanstack/react-router'
import {
  buildGooglePickerErrorRedirect,
  completeGooglePickerAuth,
} from '@/lib/backend/bish/google-picker'

export const Route = createFileRoute('/api/org/knowledge/google/callback')({
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
          const redirectUrl = await buildGooglePickerErrorRedirect({
            requestUrl: request.url,
            state,
            message:
              providerErrorDescription
              || providerError
              || 'Google did not return a valid authorization code.',
          })
          return Response.redirect(redirectUrl, 302)
        }

        try {
          const redirectUrl = await completeGooglePickerAuth({
            requestUrl: request.url,
            code,
            state,
          })
          return Response.redirect(redirectUrl, 302)
        } catch (error) {
          const redirectUrl = await buildGooglePickerErrorRedirect({
            requestUrl: request.url,
            state,
            message:
              error instanceof Error
                ? error.message
                : 'Google Drive connection failed.',
          })
          return Response.redirect(redirectUrl, 302)
        }
      },
    },
  },
})
