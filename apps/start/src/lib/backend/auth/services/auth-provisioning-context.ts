import { AsyncLocalStorage } from 'node:async_hooks'

type AuthProvisioningState = {
  readonly suppressDefaultOrganization?: boolean
}

const authProvisioningStorage = new AsyncLocalStorage<AuthProvisioningState>()

/**
 * Admin-created members should join the current organization directly instead
 * of auto-provisioning their own personal workspace on first sign-up.
 * AsyncLocalStorage keeps that behavior scoped to the current auth call chain.
 */
export async function runWithSuppressedDefaultOrganizationProvisioning<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return authProvisioningStorage.run(
    { suppressDefaultOrganization: true },
    operation,
  )
}

export function isDefaultOrganizationProvisioningSuppressed(): boolean {
  return Boolean(
    authProvisioningStorage.getStore()?.suppressDefaultOrganization,
  )
}
