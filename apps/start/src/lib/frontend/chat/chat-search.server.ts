import { getRequestHeaders } from '@tanstack/react-start/server'
import { Effect } from 'effect'
import { ChatRuntime } from '@/lib/backend/chat/runtime/chat-runtime'
import { ChatSearchService } from '@/lib/backend/chat/services/chat-search.service'
import { UnauthorizedError } from '@/lib/backend/chat/domain/errors'
import { requireUserAuth } from '@/lib/backend/server-effect/http/server-auth'
import type { ChatSearchResult } from '@/lib/shared/chat-search'

/**
 * Server-side entrypoint for command palette chat search.
 * Auth extraction stays at the framework boundary while ranking/index access
 * remains inside the backend service.
 */
export async function searchChatThreadsAction(input: {
  readonly query: string
  readonly limit?: number
}): Promise<readonly ChatSearchResult[]> {
  return ChatRuntime.run(
    Effect.gen(function* () {
      const headers = getRequestHeaders()
      const authContext = yield* requireUserAuth({
        headers,
        onUnauthorized: () =>
          new UnauthorizedError({
            message: 'Unauthorized',
            requestId: 'chat-search',
          }),
      })

      const service = yield* ChatSearchService
      return yield* service.searchThreads({
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        query: input.query,
        limit: input.limit,
        requestId: crypto.randomUUID(),
      })
    }),
  )
}
