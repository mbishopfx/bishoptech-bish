'use client'

import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { PricingSection } from './pricing-section'
import { PricingComparisonTable } from './pricing-comparison-table'
import {
  openWorkspaceBillingPortal,
  startWorkspaceSubscriptionCheckout,
} from '@/lib/frontend/billing/billing.functions'
import type { StripeManagedWorkspacePlanId } from '@/lib/shared/access-control'
import { useOrgBillingSummary } from '@/lib/frontend/billing/use-org-billing'
import { isAdminRole } from '@/lib/shared/auth/roles'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { authClient } from '@/lib/frontend/auth/auth-client'
import type { PricingPlanActionOverride } from './pricing-card'
import { m } from '@/paraglide/messages.js'

/**
 * Pricing page content. Renders the pricing cards followed by the comparative
 * matrix so users can scan plan differences without leaving the pricing view.
 */
export function PricingPage() {
  const { user, activeOrganizationId } = useAppAuth()
  const { subscription } = useOrgBillingSummary()
  const openPortal = useServerFn(openWorkspaceBillingPortal)
  const startCheckout = useServerFn(startWorkspaceSubscriptionCheckout)
  const [billingActionError, setBillingActionError] = useState<string | null>(
    null,
  )
  const [canManageBilling, setCanManageBilling] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!user || !activeOrganizationId) {
      setCanManageBilling(false)
      return
    }

    void authClient.organization
      .getActiveMemberRole({
        query: {
          organizationId: activeOrganizationId,
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.role) {
          setCanManageBilling(false)
          return
        }

        setCanManageBilling(isAdminRole(data.role))
      })

    return () => {
      cancelled = true
    }
  }, [activeOrganizationId, user])

  const resolvePlanAction = useMemo(() => {
    const hasActiveWorkspace = Boolean(activeOrganizationId)
    const isSignedIn = Boolean(user)
    const stripePlanByName: Record<string, StripeManagedWorkspacePlanId> = {
      Plus: 'plus',
      Pro: 'pro',
      Scale: 'scale',
    }
    const hasStripeManagedSubscription =
      Boolean(subscription?.providerSubscriptionId) &&
      (subscription?.planId === 'plus' ||
        subscription?.planId === 'pro' ||
        subscription?.planId === 'scale')

    return (planName: string): PricingPlanActionOverride | undefined => {
      const stripePlanId = stripePlanByName[planName]
      const isStripeManagedPlan = Boolean(stripePlanId)
      const isEnterprisePlan = planName === 'Enterprise'
      const isFreePlan = planName === 'Free'
      const isCurrentPlan =
        (hasStripeManagedSubscription &&
          subscription?.planId === stripePlanId) ||
        (isEnterprisePlan && subscription?.planId === 'enterprise') ||
        (isFreePlan &&
          (!subscription?.planId || subscription.planId === 'free'))

      if (!isSignedIn || !hasActiveWorkspace) return undefined

      if (isFreePlan) {
        const hasPaidPlan =
          subscription?.planId && subscription.planId !== 'free'
        if (hasPaidPlan) {
          return {
            disabled: true,
          }
        }
        return undefined
      }

      if (!isStripeManagedPlan && !isEnterprisePlan) return undefined

      if (isCurrentPlan) {
        if (!canManageBilling) {
          return {
            buttonText: m.pricing_manage_billing(),
            disabled: true,
          }
        }

        return {
          buttonText: m.pricing_manage_billing(),
          onSelect: async () => {
            setBillingActionError(null)
            try {
              const result = await openPortal({ data: {} })
              window.location.assign(result.url)
            } catch (error) {
              setBillingActionError(
                error instanceof Error
                  ? error.message
                  : m.pricing_error_billing_portal(),
              )
            }
          },
        }
      }

      return {
        disabled: true,
      }
    }
  }, [
    activeOrganizationId,
    canManageBilling,
    openPortal,
    startCheckout,
    subscription,
    user,
  ])

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4">
      {billingActionError ? (
        <div className="mb-4 rounded-lg border border-border-faint bg-surface-raised px-4 py-3 text-sm text-foreground-secondary">
          {billingActionError}
        </div>
      ) : null}
      <PricingSection resolvePlanAction={resolvePlanAction} />
      <PricingComparisonTable resolvePlanAction={resolvePlanAction} />
    </div>
  )
}
