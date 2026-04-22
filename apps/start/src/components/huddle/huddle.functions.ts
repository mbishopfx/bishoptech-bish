import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const exportHuddleNotesInput = z.object({
  roomId: z.string().trim().min(1),
})

export const exportHuddleNotes = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => exportHuddleNotesInput.parse(input))
  .handler(async ({ data }) => {
    const { exportHuddleNotesAction } = await import('./huddle.server')
    return exportHuddleNotesAction(data)
  })
