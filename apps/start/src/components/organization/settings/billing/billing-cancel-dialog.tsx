'use client'

import { FormDialog } from '@bish/ui/dialog'
import { m } from '@/paraglide/messages.js'

type BillingCancelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  effectiveDateLabel?: string | null
  submitError?: string | null
  submitting?: boolean
  onConfirm: () => Promise<void>
}

/**
 * Cancel-to-free is intentionally a separate confirmation step because the
 * resulting state change is deferred until period end and does not involve seat
 * math. Keeping it isolated avoids overloading the seat-selection dialog with a
 * non-seat workflow.
 */
export function BillingCancelDialog(props: BillingCancelDialogProps) {
  return (
    <FormDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={m.org_billing_cancel_dialog_title()}
      description={m.org_billing_cancel_dialog_description()}
      buttonText={m.org_billing_cancel_dialog_confirm()}
      secondaryButtonText={m.common_cancel()}
      onSecondaryClick={() => props.onOpenChange(false)}
      error={props.submitError ?? undefined}
      buttonVariant="dangerLight"
      buttonDisabled={props.submitting}
      handleSubmit={props.onConfirm}
    >
      <div className="rounded-2xl border border-border-faint bg-surface-base px-4 py-3 text-sm text-foreground-secondary">
        {m.org_billing_cancel_dialog_timing({
          effectiveDate: props.effectiveDateLabel ?? m.org_billing_summary_description_fallback(),
        })}
      </div>
    </FormDialog>
  )
}
