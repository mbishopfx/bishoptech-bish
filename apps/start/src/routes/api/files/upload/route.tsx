import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import {
  getServerAuthContext,
  requireUserAuth,
} from '@/lib/server-effect/http/server-auth.server'
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/upload/upload.model'
import {
  FileInvalidRequestError,
  FileRuntime,
  FileUnauthorizedError,
  FileUploadOrchestratorService,
  handleFileRouteFailure,
} from '@/lib/file-backend'

export const Route = createFileRoute('/api/files/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID()
        const route = '/api/files/upload'
        const program = Effect.gen(function* () {
          const authContext = yield* requireUserAuth({
            onUnauthorized: () =>
              new FileUnauthorizedError({
                message: 'Unauthorized',
                requestId,
              }),
          })

          const formData = yield* Effect.tryPromise({
            try: () => request.formData(),
            catch: () =>
              new FileInvalidRequestError({
                message: 'Invalid multipart form data',
                requestId,
              }),
          })

          const input = formData.get('file')
          if (!(input instanceof File)) {
            return yield* Effect.fail(
              new FileInvalidRequestError({
                message: 'Missing file field',
                requestId,
                issue: 'file is required',
              }),
            )
          }
          if (input.size > MAX_UPLOAD_SIZE_BYTES) {
            return yield* Effect.fail(
              new FileInvalidRequestError({
                message: `File exceeds limit of ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB`,
                requestId,
                issue: 'file_too_large',
              }),
            )
          }

          const orchestrator = yield* FileUploadOrchestratorService
          const uploaded = yield* orchestrator.upload({
            userId: authContext.userId,
            ownerOrgId: authContext.orgWorkosId,
            accessScope: 'user',
            file: input,
            requestId,
            route,
          })
          return new Response(
            JSON.stringify({
              id: uploaded.id,
              key: uploaded.key,
              url: uploaded.url,
              name: uploaded.name,
              size: uploaded.size,
              contentType: uploaded.contentType,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        })
        try {
          return await FileRuntime.run(program)
        } catch (error) {
          const userId = await Effect.runPromise(
            getServerAuthContext().pipe(
              Effect.map((context) => context.userId),
            ),
          ).catch(() => undefined)
          return handleFileRouteFailure({
            error,
            requestId,
            route,
            eventName: 'file.upload.route.failed',
            userId,
            defaultMessage: 'File upload route failed unexpectedly',
          })
        }
      },
    },
  },
})
