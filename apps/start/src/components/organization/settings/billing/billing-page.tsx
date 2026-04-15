'use client'

import { Button } from '@rift/ui/button'
import { Form } from '@rift/ui/form'
import { ContentPage } from '@/components/layout'
import { PricingCard } from '@/components/pricing/pricing-card'
import { DashedBorderFrame } from '@/components/pricing/pricing-decorative'
import { getEnterprisePlan } from '@/lib/shared/pricing'
import { m } from '@/paraglide/messages.js'
import { BillingChangeDialog } from './billing-change-dialog'
import { BillingCancelDialog } from './billing-cancel-dialog'
import { useBillingPageLogic } from './billing-page.logic'

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
  const overSeatPercent =
    isOverSeatLimit && props.activeMembers > 0
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
  const {
    loading,
    summary,
    planCards,
    cancelToFree,
    changeDialogProps,
    cancelDialogProps,
    openBillingPortal,
  } = useBillingPageLogic()

  const enterprisePlan = getEnterprisePlan()

  return (
    <ContentPage
      title={m.org_billing_page_title()}
      description={m.org_billing_page_description()}
    >
      <Form
        title={summary.title}
        description={summary.description}
        progressBar={
          summary.seatUsage
            ? {
                value: summary.seatUsage.percent,
                label: m.org_billing_seat_allocation_label(),
                valueLabel: m.org_billing_seat_allocation_value({
                  activeMembers: String(summary.seatUsage.activeMembers),
                  seatCount: String(summary.seatUsage.seatCount),
                }),
                barSlot: (
                  <SeatUsageProgressBar
                    activeMembers={summary.seatUsage.activeMembers}
                    seatCount={summary.seatUsage.seatCount}
                  />
                ),
              }
            : undefined
        }
        contentSlot={
          !loading ? (
            <div className="space-y-4">
              {summary.scheduledChangeLabel ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  {summary.scheduledChangeLabel}
                </div>
              ) : null}

              {summary.showAdminOnlyNotice ? (
                <div className="rounded-xl border border-border-faint bg-surface-overlay px-4 py-3 text-sm text-foreground-secondary">
                  {m.org_billing_admin_only_notice()}
                </div>
              ) : null}
            </div>
          ) : undefined
        }
        forceActions
        buttonText={m.org_billing_manage_details_button()}
        buttonDisabled={summary.manageDetailsDisabled}
        helpText={m.org_billing_manage_details_help()}
        handleSubmit={openBillingPortal}
      />

      <section
        className="mt-10 space-y-4"
        aria-labelledby="billing-plans-heading"
      >
        <div className="space-y-1">
          <h2
            id="billing-plans-heading"
            className="text-xl font-semibold text-foreground-strong"
          >
            {m.org_billing_plans_title()}
          </h2>
          <p className="text-sm text-foreground-secondary">
            {m.org_billing_plans_description()}
          </p>
        </div>

        <div className="grid gap-6 sm:px-4 lg:grid-cols-2 lg:px-0 xl:grid-cols-3">
          {planCards.map(({ plan, actionOverride }) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              className="mx-auto h-full max-w-[22rem]"
              actionOverride={actionOverride}
            />
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-[26rem]">
          <DashedBorderFrame frameClassName="inset-4 sm:inset-6 lg:inset-8">
            <div className="relative p-4 sm:p-6 lg:p-8">
              <PricingCard
                plan={enterprisePlan}
                className="mx-auto h-full w-full max-w-[22rem]"
              />
            </div>
          </DashedBorderFrame>
        </div>
      </section>

      {cancelToFree ? (
        <section className="mt-8 rounded-2xl border border-border-faint bg-surface-base px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground-strong">
                {cancelToFree.title}
              </h2>
              <p className="text-sm text-foreground-secondary">
                {cancelToFree.helpText}
              </p>
            </div>
            <Button
              type="button"
              variant="dangerLight"
              size="large"
              disabled={cancelToFree.disabled}
              onClick={cancelToFree.openDialog}
            >
              {cancelToFree.buttonText}
            </Button>
          </div>
        </section>
      ) : null}

      <BillingChangeDialog {...changeDialogProps} />

      <BillingCancelDialog {...cancelDialogProps} />
    </ContentPage>
  )
}
