import { createFileRoute } from '@tanstack/react-router'
import { Effect, Schema } from 'effect'
import { ServerRuntime } from '@/lib/backend/server-effect'
import { requireNonAnonymousUserAuth } from '@/lib/backend/server-effect/http/server-auth'
import { issueZeroSelfHostedAccessToken } from '@/lib/backend/zero-auth/zero-self-hosted-token.service'

class ZeroTokenUnauthorizedError extends Schema.TaggedErrorClass<ZeroTokenUnauthorizedError>()(
  'ZeroTokenUnauthorizedError',
  {
    message: Schema.String,
  },
) {}

class ZeroTokenConfigurationError extends Schema.TaggedErrorClass<ZeroTokenConfigurationError>()(
  'ZeroTokenConfigurationError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  },
) {}

export const Route = createFileRoute('/api/zero/token')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const program = Effect.gen(function* () {
          const authContext = yield* requireNonAnonymousUserAuth({
            headers: request.headers,
            onUnauthorized: () =>
              new ZeroTokenUnauthorizedError({ message: 'Unauthorized' }),
          })

          const issued = yield* Effect.try({
            try: () =>
              issueZeroSelfHostedAccessToken({
                userId: authContext.userId,
                organizationId: authContext.organizationId,
              }),
            catch: (error) =>
              new ZeroTokenConfigurationError({
                message: 'Failed to issue Zero access token.',
                cause: error instanceof Error ? error.message : String(error),
              }),
          })

          return new Response(JSON.stringify(issued), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          })
        })

        try {
          return await ServerRuntime.run(program)
        } catch (error) {
          if (error instanceof ZeroTokenUnauthorizedError) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (error instanceof ZeroTokenConfigurationError) {
            return new Response(
              JSON.stringify({
                error: 'Zero token configuration failed.',
                cause: error.cause,
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          throw error
        }
      },
    },
  },
})
