'use client'

import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { Form } from '@rift/ui/form'
import { ContentPage } from '@/components/layout'
import { reconcileActiveWorkspaceBilling } from '@/lib/frontend/billing/billing-reconcile.functions'
import { openWorkspaceBillingPortal } from '@/lib/frontend/billing/billing.functions'
import { useOrgBillingSummary } from '@/lib/frontend/billing/use-org-billing'
import { getWorkspacePlan } from '@/lib/shared/access-control'
import type { WorkspacePlanId } from '@/lib/shared/access-control'
import { m } from '@/paraglide/messages.js'

function formatUnixDate(timestampMs?: number): string | null {
  if (timestampMs == null || !Number.isFinite(timestampMs)) return null
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
 * The billing page keeps the original single-line progress layout. When an org
 * is over its paid seat count, the same track switches to a segmented fill so
 * covered members remain blue and over-limit members are called out in red.
 */
function SeatUsageProgressBar(props: {
  activeMembers: number
  seatCount: number
}) {
  const coveredMembers = Math.min(props.activeMembers, props.seatCount)
  const overSeatMembers = Math.max(0, props.activeMembers - props.seatCount)
  const isOverSeatLimit = overSeatMembers > 0
  const coveredPercent = isOverSeatLimit
    ? props.activeMembers > 0
      ? (coveredMembers / props.activeMembers) * 100
      : 0
    : props.seatCount > 0
      ? (coveredMembers / props.seatCount) * 100
      : 0
  const overSeatPercent = isOverSeatLimit && props.activeMembers > 0
    ? (overSeatMembers / props.activeMembers) * 100
    : 0

  return (
    <div
      className="bg-surface-overlay relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full"
      role="progressbar"
      aria-label={m.org_billing_seat_allocation_label()}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isOverSeatLimit ? 100 : coveredPercent}
      aria-valuetext={m.org_billing_seat_allocation_value({
        activeMembers: String(props.activeMembers),
        seatCount: String(props.seatCount),
      })}
    >
      {coveredPercent > 0 ? (
        <div
          className="bg-accent-primary h-full rounded-full"
          style={{ width: `${coveredPercent}%` }}
        />
      ) : null}
      {overSeatPercent > 0 ? (
        <div
          className="bg-rose-500 h-full"
          style={{ width: `${overSeatPercent}%` }}
        />
      ) : null}
    </div>
  )
}

export function BillingPage() {
  const { subscription, entitlement, loading } = useOrgBillingSummary()
  const openPortal = useServerFn(openWorkspaceBillingPortal)
  const reconcileBilling = useServerFn(reconcileActiveWorkspaceBilling)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const scheduledChangeDate = formatUnixDate(subscription?.scheduledChangeEffectiveAt)

  useEffect(() => {
    void reconcileBilling().catch(() => {
      // The page can render from the latest synced subscription snapshot.
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
  const billingCycle = formatBillingCycleDateRange(
    subscription?.currentPeriodStart,
    subscription?.currentPeriodEnd,
  )
  const activeMembers = entitlement?.activeMemberCount ?? 0
  const totalSeats = subscription?.seatCount ?? entitlement?.seatCount ?? 1
  const seatUsagePercent = totalSeats > 0 ? Math.min(100, (activeMembers / totalSeats) * 100) : 0

  return (
    <ContentPage
      title="Billing"
      description="Manage your workspace subscription."
    >
      <Form
        title={`${plan.name} Plan`}
        description={billingCycle}
        progressBar={
          !loading
            ? {
                value: seatUsagePercent,
                label: m.org_billing_seat_allocation_label(),
                valueLabel: m.org_billing_seat_allocation_value({
                  activeMembers: String(activeMembers),
                  seatCount: String(totalSeats),
                }),
                barSlot: (
                  <SeatUsageProgressBar
                    activeMembers={activeMembers}
                    seatCount={totalSeats}
                  />
                ),
              }
            : undefined
        }
        contentSlot={
          !loading ? (
            <div className="space-y-3">
              {subscription?.scheduledPlanId ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  Scheduled change: {subscription.scheduledPlanId}
                  {subscription.scheduledSeatCount != null
                    ? ` · ${subscription.scheduledSeatCount} seats`
                    : ''}
                  {scheduledChangeDate ? ` · effective ${scheduledChangeDate}` : ''}
                </div>
              ) : null}
            </div>
          ) : undefined
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
