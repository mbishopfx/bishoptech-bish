import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { saveUserAvatarImage } from './account-avatar.server'

const SaveAvatarInputSchema = z.object({
  avatarUrl: z.string().trim().url().max(2048),
})

export type SaveAvatarInput = z.infer<typeof SaveAvatarInputSchema>

/**
 * Input validator for avatar persistence server function.
 */
function saveAvatarInputValidator(input: unknown): SaveAvatarInput {
  return SaveAvatarInputSchema.parse(input)
}

/**
 * Server mutation to persist the user's avatar URL.
 */
export const saveAvatar = createServerFn({ method: 'POST' })
  .inputValidator(saveAvatarInputValidator)
  .handler(async ({ data }) => {
    return saveUserAvatarImage(data)
  })
