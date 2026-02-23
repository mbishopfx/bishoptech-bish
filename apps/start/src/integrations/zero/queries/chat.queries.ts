import {
  defineQuery,
} from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from '../zql'

/**
 * Chat query definitions are grouped here to keep thread/message read models
 * cohesive and avoid coupling to organization settings queries.
 */
export const chatQueryDefinitions = {
  threads: {
    /** Threads for the current user (ctx.userID). Enforced on server. */
    byUser: defineQuery(({ ctx }) =>
      zql.thread
        .where('userId', ctx.userID)
        .where('visibility', 'visible')
        .orderBy('updatedAt', 'desc'),
    ),
  },
  messages: {
    /** Messages in a thread, always scoped to the authenticated user context. */
    byThread: defineQuery(
      z.object({ threadId: z.string() }),
      ({ args, ctx }) =>
        zql.message
          .where('threadId', args.threadId)
          .where('userId', ctx.userID)
          .orderBy('created_at', 'asc'),
    ),
  },
}
