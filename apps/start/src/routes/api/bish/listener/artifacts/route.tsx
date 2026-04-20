import { createFileRoute } from '@tanstack/react-router'
import { reportLocalListenerArtifactsFromSecret } from '@/lib/backend/bish/local-listener'
import { reportLocalListenerArtifactsInput } from '@/lib/shared/local-listener'

export const Route = createFileRoute('/api/bish/listener/artifacts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = request.headers.get('x-bish-listener-secret')?.trim()
          if (!secret) {
            return Response.json(
              { error: 'Missing x-bish-listener-secret header.' },
              { status: 401 },
            )
          }

          const json = await request.json()
          const data = reportLocalListenerArtifactsInput.parse(json)
          await reportLocalListenerArtifactsFromSecret({
            secret,
            data,
          })
          return Response.json({ ok: true })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Artifact reporting failed.',
            },
            { status: 400 },
          )
        }
      },
    },
  },
})
