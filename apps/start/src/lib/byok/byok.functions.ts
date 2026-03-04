import { createServerFn } from '@tanstack/react-start'
import type { ByokUpdateAction } from './types'

/** Input shape for the server function; server performs full validation in byok-runner.ts. */
function updateByokInput(input: unknown): { data: ByokUpdateAction } {
  return input as { data: ByokUpdateAction }
}

/**
 * BYOK server function.
 */
export const updateByok = createServerFn({ method: 'POST' })
  .inputValidator(updateByokInput)
  .handler(async ({ data }: { data: unknown }) => {
    // Keep server-only dependencies behind a dynamic import so client bundles
    // never statically reference *.server modules.
    const { runUpdateByok } = await import('./byok-runner')
    return runUpdateByok(data)
  })
