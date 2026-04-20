'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { getWorkspacePlan } from '@/lib/shared/access-control'
import type {
  SelfServeWorkspacePlanId,
  StripeManagedWorkspacePlanId,
  WorkspacePlanId,
} from '@/lib/shared/access-control'
import { m } from '@/paraglide/messages.js'
import {
  resolveBillingPlanCardActionState,
  resolveBillingPlanChangeActionState,
} from './billing-page.logic'

function formatPrice(amountUsd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountUsd)
}

function coerceSeatCount(rawValue: string): number {
  const digitsOnly = rawValue.replace(/\D+/g, '')
  const parsedSeatCount = Number.parseInt(digitsOnly, 10)
  return Number.isFinite(parsedSeatCount) && parsedSeatCount > 0 ? parsedSeatCount : 1
}

type BillingChangeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetPlanId: StripeManagedWorkspacePlanId | null
  currentPlanId: WorkspacePlanId
  currentSeatCount: number
  activeMembers: number
  hasManagedSubscription: boolean
  scheduledPlanId?: SelfServeWorkspacePlanId | null
  scheduledSeatCount?: number | null
  defaultSeatCountOverride?: number | null
  billingCycleEndLabel?: string | null
  submitError?: string | null
  submitting?: boolean
  onConfirm: (input: {
    targetPlanId: StripeManagedWorkspacePlanId
    seats: number
    actionKey: string
  }) => Promise<void>
}

/**
 * Billing changes require one last explicit confirmation because seat counts
 * change the recurring total and, for upgrades, can create immediate Stripe
 * prorations. The dialog centralizes that math for every paid-plan action.
 */
export function BillingChangeDialog(props: BillingChangeDialogProps) {
  const [seatInput, setSeatInput] = useState('1')

  const targetPlan = props.targetPlanId ? getWorkspacePlan(props.targetPlanId) : null
  const currentPlan = getWorkspacePlan(props.currentPlanId)
  const defaultSeatCount = props.defaultSeatCountOverride != null
    ? props.defaultSeatCountOverride
    : props.targetPlanId != null
      && props.scheduledPlanId === props.targetPlanId
      && props.scheduledSeatCount != null
      ? props.scheduledSeatCount
      : props.currentSeatCount

  useEffect(() => {
    if (!props.open) {
      return
    }

    setSeatInput(String(Math.max(1, defaultSeatCount)))
  }, [defaultSeatCount, props.open, props.targetPlanId])

  if (!props.targetPlanId || !targetPlan) {
    return null
  }

  const selectedSeatCount = coerceSeatCount(seatInput)
  const cardActionState = resolveBillingPlanCardActionState({
    targetPlanId: props.targetPlanId,
    currentPlanId: props.currentPlanId,
    hasManagedSubscription: props.hasManagedSubscription,
    scheduledPlanId: props.scheduledPlanId,
  })
  const changeActionState = resolveBillingPlanChangeActionState({
    targetPlanId: props.targetPlanId,
    selectedSeatCount,
    currentPlanId: props.currentPlanId,
    currentSeatCount: props.currentSeatCount,
    scheduledPlanId: props.scheduledPlanId,
    scheduledSeatCount: props.scheduledSeatCount,
  })
  const pricePerSeat = targetPlan.monthlyPriceUsd
  const nextMonthlyTotal = pricePerSeat * selectedSeatCount
  const isSeatReductionBelowMembers = selectedSeatCount < props.activeMembers

  const dialogTitle = cardActionState === 'subscribe'
    ? m.org_billing_dialog_title_subscribe({ planName: targetPlan.name })
    : cardActionState === 'downgrade'
      ? m.org_billing_dialog_title_downgrade({ planName: targetPlan.name })
      : cardActionState === 'upgrade'
        ? m.org_billing_dialog_title_upgrade({ planName: targetPlan.name })
        : m.org_billing_dialog_title_manage({ planName: targetPlan.name })
  const dialogDescription = cardActionState === 'subscribe'
    ? m.org_billing_dialog_description_subscribe({
        planName: targetPlan.name,
      })
    : m.org_billing_dialog_description_change({
        currentPlanName: currentPlan.name,
        targetPlanName: targetPlan.name,
      })
  const timingLabel = changeActionState === 'downgrade'
    ? m.org_billing_dialog_timing_period_end({
        effectiveDate: props.billingCycleEndLabel ?? m.org_billing_summary_description_fallback(),
      })
    : m.org_billing_dialog_timing_immediate()
  const confirmButtonText = changeActionState === 'current'
    ? m.org_billing_current_plan_button()
    : changeActionState === 'scheduled'
      ? m.org_billing_scheduled_button()
      : changeActionState === 'downgrade'
        ? m.org_billing_dialog_confirm_downgrade()
        : cardActionState === 'subscribe'
          ? m.org_billing_dialog_confirm_subscribe()
          : m.org_billing_dialog_confirm_upgrade()

  return (
    <FormDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      buttonText={confirmButtonText}
      secondaryButtonText={m.common_cancel()}
      onSecondaryClick={() => props.onOpenChange(false)}
      error={props.submitError ?? undefined}
      submitButtonDisabled={
        props.submitting
        || changeActionState === 'current'
        || changeActionState === 'scheduled'
      }
      buttonDisabled={props.submitting}
      handleSubmit={() =>
        props.onConfirm({
          targetPlanId: props.targetPlanId!,
          seats: selectedSeatCount,
          actionKey: `${props.targetPlanId}:${selectedSeatCount}`,
        })}
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="billing-change-seat-count">
            {m.org_billing_dialog_seat_input_label()}
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Decrease seats"
              onClick={() => setSeatInput(String(Math.max(1, selectedSeatCount - 1)))}
            >
              <Minus />
            </Button>
            <Input
              id="billing-change-seat-count"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={seatInput}
              onChange={(event) => setSeatInput(event.target.value.replace(/\D+/g, ''))}
              onBlur={() => setSeatInput(String(selectedSeatCount))}
              className="w-20 shrink-0 text-center tabular-nums"
              aria-describedby="billing-change-seat-count-help"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Increase seats"
              onClick={() => setSeatInput(String(selectedSeatCount + 1))}
            >
              <Plus />
            </Button>
          </div>
          <p
            id="billing-change-seat-count-help"
            className="text-sm text-foreground-secondary"
          >
            {m.org_billing_dialog_seat_input_help()}
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border-faint bg-surface-overlay/60 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground-secondary">
              {m.org_billing_dialog_price_per_seat_label()}
            </span>
            <span className="font-medium text-foreground-strong">
              {m.org_billing_dialog_price_per_seat_value({
                price: formatPrice(pricePerSeat),
              })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground-secondary">
              {m.org_billing_dialog_new_total_label()}
            </span>
            <span className="font-medium text-foreground-strong">
              {m.org_billing_dialog_total_value({
                price: formatPrice(nextMonthlyTotal),
              })}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border-faint bg-surface-base px-4 py-3 text-sm text-foreground-secondary">
          {timingLabel}
        </div>

        {isSeatReductionBelowMembers ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {m.org_billing_seat_warning({
              activeMembers: String(props.activeMembers),
              selectedSeats: String(selectedSeatCount),
            })}
          </div>
        ) : null}
      </div>
    </FormDialog>
  )
}
