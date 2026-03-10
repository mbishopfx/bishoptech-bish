import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { setUserPassword } from './security-password.server'

const SetPasswordInputSchema = z.object({
  newPassword: z.string().trim().min(8).max(128),
})

export type SetPasswordInput = z.infer<typeof SetPasswordInputSchema>

/**
 * Input validator for setting a credential password.
 */
function setPasswordInputValidator(input: unknown): SetPasswordInput {
  return SetPasswordInputSchema.parse(input)
}

/**
 * Server mutation that sets a password for the authenticated user.
 */
export const setPassword = createServerFn({ method: 'POST' })
  .inputValidator(setPasswordInputValidator)
  .handler(async ({ data }) => {
    return setUserPassword(data)
  })
