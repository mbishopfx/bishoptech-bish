import { createFileRoute } from '@tanstack/react-router'
import { registerLocalListenerFromSecret } from '@/lib/backend/bish/local-listener'
import { registerLocalListenerInput } from '@/lib/shared/local-listener'

export const Route = createFileRoute('/api/bish/listener/register')({
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
          const data = registerLocalListenerInput.parse(json)
          const listener = await registerLocalListenerFromSecret({
            secret,
            data,
          })
          return Response.json({ listener })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : 'Registration failed.',
            },
            { status: 400 },
          )
        }
      },
    },
  },
})
