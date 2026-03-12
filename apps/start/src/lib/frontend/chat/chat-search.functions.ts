import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const SearchChatThreadsInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(30).optional(),
})

/**
 * Thin command-search server function. Validation stays here; all search
 * orchestration and SQL execution live in the chat backend runtime.
 */
export const searchChatThreads = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SearchChatThreadsInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { searchChatThreadsAction } = await import('./chat-search.server')
    return searchChatThreadsAction(data)
  })
