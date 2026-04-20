import { createFileRoute } from '@tanstack/react-router'
import { reportLocalListenerActivityFromSecret } from '@/lib/backend/bish/local-listener'
import { reportLocalListenerActivityInput } from '@/lib/shared/local-listener'

export const Route = createFileRoute('/api/bish/listener/activity')({
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
          const data = reportLocalListenerActivityInput.parse(json)
          await reportLocalListenerActivityFromSecret({
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
                  : 'Activity reporting failed.',
            },
            { status: 400 },
          )
        }
      },
    },
  },
})
