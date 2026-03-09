'use client'

import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { Form } from '@rift/ui/form'
import { ContentPage } from '@/components/layout'
import { reconcileActiveWorkspaceBilling } from '@/lib/billing/billing-reconcile.functions'
import { openWorkspaceBillingPortal } from '@/lib/billing/billing.functions'
import { getWorkspacePlan } from '@/lib/billing/plan-catalog'
import { useOrgBillingSummary } from '@/lib/billing/use-org-billing'
import type { WorkspacePlanId } from '@/lib/billing/plan-catalog'

function formatUnixDate(timestampMs?: number): string | null {
  if (!timestampMs) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestampMs))
}

function formatBillingCycleDateRange(
  periodStartMs?: number,
  periodEndMs?: number,
): string {
  const start = formatUnixDate(periodStartMs)
  const end = formatUnixDate(periodEndMs)
  if (start && end) return `${start} – ${end}`
  if (end) return `Through ${end}`
  if (start) return `From ${start}`
  return ''
}

/**
 * Billing settings page. Displays subscription status, plan and seat info,
 * a usage bar for active vs paid seats, and access to the Stripe billing portal.
 */
export function BillingPage() {
  const { subscription, entitlement, loading } = useOrgBillingSummary()
  const openPortal = useServerFn(openWorkspaceBillingPortal)
  const reconcileBilling = useServerFn(reconcileActiveWorkspaceBilling)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const scheduledChangeDate = formatUnixDate(subscription?.scheduledChangeEffectiveAt)

  useEffect(() => {
    void reconcileBilling().catch(() => {
      // UI can still render from last synced snapshot if reconciliation fails.
    })
  }, [reconcileBilling])

  async function handleOpenPortal() {
    setErrorMessage(null)
    try {
      const result = await openPortal({ data: {} })
      window.location.assign(result.url)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Billing portal could not be opened',
      )
      throw error
    }
  }

  const planId = (entitlement?.planId ?? subscription?.planId ?? 'free') as WorkspacePlanId
  const plan = getWorkspacePlan(planId)
  const planTitle = `${plan.name} Plan`
  const billingCycle = formatBillingCycleDateRange(
    subscription?.currentPeriodStart,
    subscription?.currentPeriodEnd,
  )
  const activeMembers = entitlement?.activeMemberCount ?? 0
  const totalSeats = subscription?.seatCount ?? entitlement?.seatCount ?? 1
  const usagePercent = totalSeats > 0 ? Math.min(100, (activeMembers / totalSeats) * 100) : 0

  return (
    <ContentPage
      title="Billing"
      description="Manage your workspace subscription."
    >
      <Form
        title={planTitle}
        description={billingCycle}
        progressBar={
          !loading
            ? {
                value: usagePercent,
                label: 'Seat usage',
                valueLabel: `${activeMembers} of ${totalSeats} seats`,
              }
            : undefined
        }
        contentSlot={
          !loading && subscription?.scheduledPlanId ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Scheduled change: {subscription.scheduledPlanId}
              {subscription.scheduledSeatCount != null
                ? ` · ${subscription.scheduledSeatCount} seats`
                : ''}
              {scheduledChangeDate ? ` · effective ${scheduledChangeDate}` : ''}
            </div>
          ) : null
        }
        forceActions
        buttonText="Manage subscription"
        buttonDisabled={loading}
        error={errorMessage ?? undefined}
        helpText="Update subscription, change seats, or manage payment methods in the Stripe billing portal."
        handleSubmit={handleOpenPortal}
      />
    </ContentPage>
  )
}
