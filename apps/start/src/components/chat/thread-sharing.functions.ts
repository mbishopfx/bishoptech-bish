import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const updateThreadParticipantsInput = z.object({
  threadId: z.string().trim().min(1),
  participantUserIds: z.array(z.string().trim().min(1)).max(100),
})

export const updateThreadParticipants = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    updateThreadParticipantsInput.parse(input),
  )
  .handler(async ({ data }) => {
    const { updateThreadParticipantsAction } = await import(
      './thread-sharing.server'
    )
    return updateThreadParticipantsAction(data)
  })
