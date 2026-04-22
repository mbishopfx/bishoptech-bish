import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const createOrganizationMemberInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  role: z.enum(['member', 'admin']),
  name: z.string().trim().min(1).max(120).optional(),
})

export const createOrganizationMember = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createOrganizationMemberInput.parse(input))
  .handler(async ({ data }) => {
    const { createOrganizationMemberAction } = await import('./members.server')
    return createOrganizationMemberAction(data)
  })
