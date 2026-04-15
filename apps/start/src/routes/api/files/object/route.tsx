import { createFileRoute } from '@tanstack/react-router'
import {
  UploadServiceError,
  uploadService,
  verifyStorageKeySignature,
} from '@/lib/backend/upload/upload.service'

const MAX_KEY_LENGTH = 512

function isLikelyValidStorageKey(key: string): boolean {
  if (key.length <= 0 || key.length > MAX_KEY_LENGTH) return false
  if (key.includes('..')) return false
  if (key.startsWith('/')) return false
  return true
}

function signaturePreview(signature: string): string {
  if (!signature) return ''
  return signature.length <= 12
    ? signature
    : `${signature.slice(0, 6)}…${signature.slice(-6)}`
}

export const Route = createFileRoute('/api/files/object')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = crypto.randomUUID()
        const url = new URL(request.url)
        const key = url.searchParams.get('key')?.trim() ?? ''
        const signature = url.searchParams.get('sig')?.trim() ?? ''

        if (!isLikelyValidStorageKey(key)) {
          console.warn('[rift:file-proxy.invalid-key]', {
            requestId,
            key,
          })

          return new Response(
            JSON.stringify({
              error: 'Invalid storage key',
              requestId,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        if (!signature || !verifyStorageKeySignature({ key, signature })) {
          console.warn('[rift:file-proxy.invalid-signature]', {
            requestId,
            key,
            signaturePreview: signaturePreview(signature),
            betterAuthSecretConfigured: Boolean(
              process.env.BETTER_AUTH_SECRET?.trim(),
            ),
          })

          return new Response(
            JSON.stringify({
              error: 'Invalid file signature',
              requestId,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        try {
          console.info('[rift:file-proxy.request]', {
            requestId,
            key,
          })

          return await uploadService.readObjectByKey({
            key,
            requestId,
          })
        } catch (error) {
          if (error instanceof UploadServiceError) {
            console.error('[rift:file-proxy.route.failed]', {
              requestId,
              key,
              errorMessage: error.message,
              statusCode: error.statusCode,
            })

            return new Response(
              JSON.stringify({
                error: error.message,
                requestId,
              }),
              {
                status: error.statusCode,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          console.error('[rift:file-proxy.route.failed.unknown]', {
            requestId,
            key,
            error: String(error),
          })

          return new Response(
            JSON.stringify({
              error: 'Failed to fetch object',
              requestId,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
