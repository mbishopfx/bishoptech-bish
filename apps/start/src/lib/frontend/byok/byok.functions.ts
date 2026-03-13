import { createServerFn } from '@tanstack/react-start'
import type { ByokUpdateAction } from '@/lib/shared/byok/types'

/** Input shape for the server function; server performs full validation in byok-runner.ts. */
function updateByokInput(input: unknown): ByokUpdateAction {
  return input as ByokUpdateAction
}

/**
 * BYOK server function.
 */
export const updateByok = createServerFn({ method: 'POST' })
  .inputValidator(updateByokInput)
  .handler(async ({ data }) => {
    const { updateByokAction } = await import('./byok.server')
    return updateByokAction({ data })
  })
