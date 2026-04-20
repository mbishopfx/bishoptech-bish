'use client'

const BILLING_RECONCILE_ON_RETURN_STORAGE_KEY =
  'bish.billing.reconcile-on-return'

function resolveBrowserUrl(rawUrl: string): URL | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return new URL(rawUrl, window.location.href)
  } catch {
    return null
  }
}

/**
 * Stripe-hosted flows return to the app later, so the billing page needs a
 * one-shot signal to reconcile after the user comes back. Local redirects do
 * not need that extra round-trip because the app already updated its mirror.
 */
export function markBillingReconcileOnReturnIfNeeded(redirectUrl: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const resolvedUrl = resolveBrowserUrl(redirectUrl)
  if (!resolvedUrl) {
    return
  }

  if (resolvedUrl.origin !== window.location.origin) {
    window.sessionStorage.setItem(
      BILLING_RECONCILE_ON_RETURN_STORAGE_KEY,
      '1',
    )
  }
}

/**
 * The marker is consumed once so normal billing page visits stay cheap.
 */
export function consumeBillingReconcileOnReturnFlag(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const shouldReconcile =
    window.sessionStorage.getItem(BILLING_RECONCILE_ON_RETURN_STORAGE_KEY) === '1'

  if (shouldReconcile) {
    window.sessionStorage.removeItem(BILLING_RECONCILE_ON_RETURN_STORAGE_KEY)
  }

  return shouldReconcile
}
