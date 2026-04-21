import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/components/auth/auth-shared'
import { m } from '@/paraglide/messages.js'

const SelfHostedSetupInputSchema = z.object({
  setupToken: z.string().trim().min(1, m.setup_error_token_required()),
  name: z.string().trim().min(1, m.setup_error_name_required()),
  email: z.string().trim().email(m.setup_error_email_invalid()),
  password: z
    .string()
    .min(
      AUTH_PASSWORD_MIN_LENGTH,
      m.setup_error_password_min_length({
        count: String(AUTH_PASSWORD_MIN_LENGTH),
      }),
    ),
})

const SelfHostedSetupTokenSchema = z.object({
  setupToken: z.string().trim().min(1, m.setup_error_token_required()),
})

export const getInstanceEnvironmentSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getInstanceEnvironmentSnapshotAction } = await import('./instance.server')
  return getInstanceEnvironmentSnapshotAction()
})

export const getSelfHostedAppAccessSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getSelfHostedAppAccessSnapshotAction } = await import(
    './instance.server'
  )
  return getSelfHostedAppAccessSnapshotAction()
})

export const getAppAccessSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getAppAccessSnapshotAction } = await import('./instance.server')
  return getAppAccessSnapshotAction()
})

export const verifySelfHostedSetupAccess = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SelfHostedSetupTokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifySelfHostedSetupAccessAction } = await import('./instance.server')
    return verifySelfHostedSetupAccessAction(data)
  })

export const runSelfHostedSetup = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SelfHostedSetupInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runSelfHostedSetupAction } = await import('./instance.server')
    return runSelfHostedSetupAction(data)
  })
