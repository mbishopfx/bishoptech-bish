'use client'

import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PricingPlanActionOverride } from '@/components/pricing/pricing-card'
import { resolveBillingManagementUiState } from './billing-ui-policy'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import {
  consumeBillingReconcileOnReturnFlag,
  markBillingReconcileOnReturnIfNeeded,
} from '@/lib/frontend/billing/billing-return-reconcile'
import { reconcileActiveWorkspaceBilling } from '@/lib/frontend/billing/billing-reconcile.functions'
import {
  changeWorkspaceSubscription,
  openWorkspaceBillingPortal,
} from '@/lib/frontend/billing/billing.functions'
import { useOrgBillingSummary } from '@/lib/frontend/billing/use-org-billing'
import { getMainPlans } from '@/lib/shared/pricing'
import type { LandingPlan } from '@/lib/shared/pricing'
import {
  coerceWorkspacePlanId,
  getWorkspacePlan,
  getWorkspacePlanRank,
  isStripeManagedWorkspacePlan,
} from '@/lib/shared/access-control'
import type {
  SelfServeWorkspacePlanId,
  StripeManagedWorkspacePlanId,
  WorkspacePlanId,
} from '@/lib/shared/access-control'
import { m } from '@/paraglide/messages.js'

const PAID_PLAN_CARDS = getMainPlans().filter(
  (plan) => plan.workspacePlanId != null && plan.workspacePlanId !== 'free',
)

export type BillingPlanCardActionState =
  | 'manage'
  | 'scheduled'
  | 'subscribe'
  | 'upgrade'
  | 'downgrade'

export type BillingPlanChangeActionState =
  | 'current'
  | 'scheduled'
  | 'upgrade'
  | 'downgrade'

export type BillingPageLogicResult = {
  loading: boolean
  summary: {
    title: string
    description: string
    seatUsage: {
      percent: number
      activeMembers: number
      seatCount: number
    } | null
    scheduledChangeLabel: string | null
    showAdminOnlyNotice: boolean
    manageDetailsDisabled: boolean
  }
  planCards: Array<{
    plan: LandingPlan
    actionOverride?: PricingPlanActionOverride
  }>
  cancelToFree: {
    title: string
    helpText: string
    buttonText: string
    disabled: boolean
    openDialog: () => void
  } | null
  changeDialogProps: {
    open: boolean
    onOpenChange: (open: boolean) => void
    targetPlanId: StripeManagedWorkspacePlanId | null
    currentPlanId: WorkspacePlanId
    currentSeatCount: number
    activeMembers: number
    hasManagedSubscription: boolean
    scheduledPlanId?: SelfServeWorkspacePlanId | null
    scheduledSeatCount?: number | null
    billingCycleEndLabel?: string | null
    submitError?: string | null
    submitting?: boolean
    onConfirm: (input: {
      targetPlanId: StripeManagedWorkspacePlanId
      seats: number
      actionKey: string
    }) => Promise<void>
  }
  cancelDialogProps: {
    open: boolean
    onOpenChange: (open: boolean) => void
    effectiveDateLabel?: string | null
    submitError?: string | null
    submitting?: boolean
    onConfirm: () => Promise<void>
  }
  openBillingPortal: () => Promise<void>
}

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
  if (start && end) return `${start} - ${end}`
  if (end) return `Through ${end}`
  if (start) return `From ${start}`
  return ''
}

/**
 * Stripe can schedule either a plan swap or a cancel-at-period-end. The page
 * collapses both cases into a single banner/button label so the UI does not
 * have to understand billing schedule semantics.
 */
function formatScheduledChangeLabel(input: {
  scheduledPlanId?: WorkspacePlanId | null
  scheduledSeatCount?: number | null
  effectiveAtLabel?: string | null
}): string | null {
  if (!input.scheduledPlanId) {
    return null
  }

  if (input.scheduledPlanId === 'free') {
    if (input.effectiveAtLabel) {
      return m.org_billing_scheduled_cancel_banner({
        effectiveDate: input.effectiveAtLabel,
      })
    }

    return m.org_billing_scheduled_cancel_button()
  }

  const planName = getWorkspacePlan(input.scheduledPlanId).name
  const seatCount = input.scheduledSeatCount ?? 1

  if (input.effectiveAtLabel) {
    return m.org_billing_scheduled_change_banner({
      planName,
      seatCount: String(seatCount),
      effectiveDate: input.effectiveAtLabel,
    })
  }

  return m.org_billing_scheduled_change_button({
    planName,
    seatCount: String(seatCount),
  })
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message
  }
  return fallback
}

function resolvePlanActionButtonText(
  actionState: BillingPlanCardActionState,
): string {
  if (actionState === 'manage') {
    return m.org_billing_manage_seats_button()
  }
  if (actionState === 'scheduled') {
    return m.org_billing_scheduled_button()
  }
  if (actionState === 'upgrade' || actionState === 'subscribe') {
    return m.org_billing_upgrade_now_button()
  }
  return m.org_billing_schedule_downgrade_button()
}

function resolveStripePlanIdForCard(
  pricingPlan: LandingPlan,
): StripeManagedWorkspacePlanId | null {
  const workspacePlanId = pricingPlan.workspacePlanId
  if (!workspacePlanId) {
    return null
  }

  const workspacePlan = getWorkspacePlan(workspacePlanId)
  return isStripeManagedWorkspacePlan(workspacePlan) ? workspacePlan.id : null
}

export function isDowngradeSelection(input: {
  currentPlanId: WorkspacePlanId
  currentSeatCount: number
  targetPlanId: StripeManagedWorkspacePlanId
  selectedSeatCount: number
}): boolean {
  const currentPlanRank = getWorkspacePlanRank(input.currentPlanId)
  const targetPlanRank = getWorkspacePlanRank(input.targetPlanId)

  return (
    targetPlanRank < currentPlanRank ||
    (targetPlanRank === currentPlanRank &&
      input.selectedSeatCount < input.currentSeatCount)
  )
}

export function resolveBillingPlanCardActionState(input: {
  targetPlanId: StripeManagedWorkspacePlanId
  currentPlanId: WorkspacePlanId
  hasManagedSubscription: boolean
  scheduledPlanId?: SelfServeWorkspacePlanId | null
}): BillingPlanCardActionState {
  if (input.targetPlanId === input.currentPlanId) {
    return 'manage'
  }

  if (input.scheduledPlanId === input.targetPlanId) {
    return 'scheduled'
  }

  if (!input.hasManagedSubscription || input.currentPlanId === 'free') {
    return 'subscribe'
  }

  return getWorkspacePlanRank(input.targetPlanId) >
    getWorkspacePlanRank(input.currentPlanId)
    ? 'upgrade'
    : 'downgrade'
}

/**
 * Once the user picks a seat count in the dialog, the action collapses to the
 * final transition that will actually be submitted to billing.
 */
export function resolveBillingPlanChangeActionState(input: {
  targetPlanId: StripeManagedWorkspacePlanId
  selectedSeatCount: number
  currentPlanId: WorkspacePlanId
  currentSeatCount: number
  scheduledPlanId?: SelfServeWorkspacePlanId | null
  scheduledSeatCount?: number | null
}): BillingPlanChangeActionState {
  if (
    input.scheduledPlanId === input.targetPlanId &&
    input.scheduledSeatCount === input.selectedSeatCount
  ) {
    return 'scheduled'
  }

  if (
    input.currentPlanId === input.targetPlanId &&
    input.currentSeatCount === input.selectedSeatCount
  ) {
    return 'current'
  }

  return isDowngradeSelection({
    currentPlanId: input.currentPlanId,
    currentSeatCount: input.currentSeatCount,
    targetPlanId: input.targetPlanId,
    selectedSeatCount: input.selectedSeatCount,
  })
    ? 'downgrade'
    : 'upgrade'
}

export function isScheduledCancelToFree(input: {
  scheduledPlanId?: SelfServeWorkspacePlanId | null
  cancelAtPeriodEnd?: boolean
}): boolean {
  return input.scheduledPlanId === 'free' || input.cancelAtPeriodEnd === true
}

/**
 * Centralizes every mutable concern on the billing page: reconciliation,
 * organization-role permissions, Stripe checkout hand-offs, and derived copy.
 * The page component can stay focused on layout and presentational JSX.
 */
export function useBillingPageLogic(): BillingPageLogicResult {
  const { activeOrganizationId, activeOrganizationRole } = useAppAuth()
  const { subscription, entitlement, loading } = useOrgBillingSummary()
  const openPortal = useServerFn(openWorkspaceBillingPortal)
  const reconcileBilling = useServerFn(reconcileActiveWorkspaceBilling)
  const mutateSubscription = useServerFn(changeWorkspaceSubscription)
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(
    null,
  )
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null)
  const [dialogPlanId, setDialogPlanId] =
    useState<StripeManagedWorkspacePlanId | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [shouldReconcileOnMount] = useState(() =>
    consumeBillingReconcileOnReturnFlag(),
  )
  const billingActionInFlightRef = useRef(false)
  const billingManagementUiState = resolveBillingManagementUiState({
    activeOrganizationId,
    activeOrganizationRole,
  })
  const canManageBilling = billingManagementUiState.canManageBilling

  useEffect(() => {
    if (!shouldReconcileOnMount || !activeOrganizationId) {
      return
    }

    void reconcileBilling().catch(() => {
      // The page can still render from the latest synced subscription snapshot.
    })
  }, [activeOrganizationId, reconcileBilling, shouldReconcileOnMount])

  const currentPlanId = coerceWorkspacePlanId(
    entitlement?.planId ?? subscription?.planId,
  )
  const currentPlan = getWorkspacePlan(currentPlanId)
  const currentSeatCount =
    subscription?.seatCount ?? entitlement?.seatCount ?? 1
  const activeMembers = entitlement?.activeMemberCount ?? 0
  const currentPeriodEndLabel = formatUnixDate(subscription?.currentPeriodEnd)
  const billingCycleLabel = formatBillingCycleDateRange(
    subscription?.currentPeriodStart,
    subscription?.currentPeriodEnd,
  )
  const hasManagedSubscription = Boolean(subscription?.providerSubscriptionId)
  const scheduledPlanId = subscription?.scheduledPlanId ?? null
  const scheduledWorkspacePlanId = scheduledPlanId
    ? coerceWorkspacePlanId(scheduledPlanId)
    : null
  const scheduledChangeDateLabel = formatUnixDate(
    subscription?.scheduledChangeEffectiveAt,
  )
  const scheduledChangeLabel = formatScheduledChangeLabel({
    scheduledPlanId: scheduledWorkspacePlanId,
    scheduledSeatCount: subscription?.scheduledSeatCount ?? null,
    effectiveAtLabel: scheduledChangeDateLabel,
  })
  const seatUsagePercent =
    currentSeatCount > 0
      ? Math.min(100, (activeMembers / currentSeatCount) * 100)
      : 0
  const actionsDisabled =
    loading || !canManageBilling || pendingActionKey != null
  const scheduledCancel = isScheduledCancelToFree({
    scheduledPlanId,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
  })

  /**
   * Every billing mutation ends in a Stripe-hosted URL, so we use one helper to
   * coordinate pending state, shared error handling, and the final redirect.
   */
  async function runSubscriptionChange(input: {
    targetPlanId: 'free' | StripeManagedWorkspacePlanId
    seats?: number
    actionKey: string
    source?: 'dialog'
  }) {
    if (billingActionInFlightRef.current) {
      return
    }

    billingActionInFlightRef.current = true
    setDialogErrorMessage(null)
    setPendingActionKey(input.actionKey)

    try {
      const result = await mutateSubscription({
        data: {
          targetPlanId: input.targetPlanId,
          seats: input.seats,
        },
      })
      markBillingReconcileOnReturnIfNeeded(result.url)
      window.location.assign(result.url)
    } catch (cause) {
      const message = getErrorMessage(
        cause,
        m.org_billing_error_change_subscription(),
      )

      if (input.source === 'dialog') {
        setDialogErrorMessage(message)
      } else {
        toast.error(message)
      }
    } finally {
      billingActionInFlightRef.current = false
      setPendingActionKey(null)
    }
  }

  async function openBillingPortal() {
    if (billingActionInFlightRef.current) {
      return
    }

    billingActionInFlightRef.current = true
    setPendingActionKey('portal')

    try {
      const result = await openPortal({ data: {} })
      markBillingReconcileOnReturnIfNeeded(result.url)
      window.location.assign(result.url)
    } catch (cause) {
      toast.error(getErrorMessage(cause, m.pricing_error_billing_portal()))
    } finally {
      billingActionInFlightRef.current = false
      setPendingActionKey(null)
    }
  }

  function openBillingDialog(targetPlanId: StripeManagedWorkspacePlanId) {
    setDialogErrorMessage(null)
    setDialogPlanId(targetPlanId)
  }

  function openCancelDialog() {
    setDialogErrorMessage(null)
    setCancelDialogOpen(true)
  }

  function handleChangeDialogOpenChange(open: boolean) {
    if (open) {
      return
    }

    if (pendingActionKey != null) {
      return
    }

    setDialogPlanId(null)
    setDialogErrorMessage(null)
  }

  function handleCancelDialogOpenChange(open: boolean) {
    if (open) {
      setCancelDialogOpen(true)
      return
    }

    if (pendingActionKey != null) {
      return
    }

    setCancelDialogOpen(false)
    setDialogErrorMessage(null)
  }

  function resolvePlanAction(
    pricingPlan: LandingPlan,
  ): PricingPlanActionOverride | undefined {
    const targetPlanId = resolveStripePlanIdForCard(pricingPlan)
    if (!targetPlanId) {
      return undefined
    }

    const actionState = resolveBillingPlanCardActionState({
      targetPlanId,
      currentPlanId,
      scheduledPlanId,
      hasManagedSubscription,
    })

    return {
      buttonText: resolvePlanActionButtonText(actionState),
      disabled: actionState === 'scheduled' || actionsDisabled,
      onSelect:
        actionState === 'scheduled'
          ? undefined
          : () => openBillingDialog(targetPlanId),
    }
  }

  return {
    loading,
    summary: {
      title: m.org_billing_summary_title({ planName: currentPlan.name }),
      description:
        billingCycleLabel || m.org_billing_summary_description_fallback(),
      seatUsage: loading
        ? null
        : {
            percent: seatUsagePercent,
            activeMembers,
            seatCount: currentSeatCount,
          },
      scheduledChangeLabel,
      showAdminOnlyNotice: billingManagementUiState.showAdminOnlyNotice,
      manageDetailsDisabled: actionsDisabled,
    },
    planCards: PAID_PLAN_CARDS.map((plan) => ({
      plan,
      actionOverride: resolvePlanAction(plan),
    })),
    cancelToFree:
      currentPlanId === 'free'
        ? null
        : {
            title: m.org_billing_cancel_to_free_title(),
            helpText: scheduledCancel
              ? m.org_billing_cancel_to_free_scheduled_help({
                  effectiveDate:
                    scheduledChangeDateLabel ??
                    m.org_billing_summary_description_fallback(),
                })
              : m.org_billing_cancel_to_free_help(),
            buttonText: scheduledCancel
              ? m.org_billing_scheduled_cancel_button()
              : m.org_billing_cancel_to_free_button(),
            disabled: scheduledCancel || actionsDisabled,
            openDialog: openCancelDialog,
          },
    changeDialogProps: {
      open: dialogPlanId != null,
      onOpenChange: handleChangeDialogOpenChange,
      targetPlanId: dialogPlanId,
      currentPlanId,
      currentSeatCount,
      activeMembers,
      hasManagedSubscription,
      scheduledPlanId,
      scheduledSeatCount:
        dialogPlanId != null && scheduledPlanId === dialogPlanId
          ? (subscription?.scheduledSeatCount ?? null)
          : null,
      billingCycleEndLabel: currentPeriodEndLabel,
      submitError: dialogErrorMessage,
      submitting: pendingActionKey != null,
      onConfirm: async ({ targetPlanId, seats, actionKey }) => {
        await runSubscriptionChange({
          targetPlanId,
          seats,
          actionKey,
          source: 'dialog',
        })
      },
    },
    cancelDialogProps: {
      open: cancelDialogOpen,
      onOpenChange: handleCancelDialogOpenChange,
      effectiveDateLabel: currentPeriodEndLabel,
      submitError: dialogErrorMessage,
      submitting: pendingActionKey != null,
      onConfirm: async () => {
        await runSubscriptionChange({
          targetPlanId: 'free',
          actionKey: 'cancel-to-free',
          source: 'dialog',
        })
      },
    },
    openBillingPortal,
  }
}
