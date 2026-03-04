'use client'

import { ContentPage } from '@/components/layout'
import { m } from '@/paraglide/messages.js'
import { ComplianceFlagsSection } from './compliance-flags-section'
import { ModelControlsSection } from './model-controls-section'
import { ProviderControlsSection } from './provider-controls-section'
import { useProviderPolicy } from './use-provider-policy'

/**
 * Full provider-policy (model-policy) settings page: ContentPage layout with
 * Form-based sections for compliance flags, provider controls, and model controls.
 */
export function ProviderPolicyPage() {
  const { payload, loading, error, updating, update } = useProviderPolicy()
  const busy = loading || updating

  return (
    <ContentPage
      title={m.org_provider_policy_page_title()}
      description={m.org_provider_policy_page_description()}
    >
      {loading && (
        <p className="text-sm text-content-muted">{m.org_provider_policy_loading()}</p>
      )}

      {error && (
        <div
          className="rounded-md border border-border-default bg-bg-subtle px-3 py-2 text-sm text-content-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <ComplianceFlagsSection
        payload={payload}
        updating={busy}
        update={update}
      />
      <ProviderControlsSection
        payload={payload}
        updating={busy}
        update={update}
      />
      <ModelControlsSection payload={payload} updating={busy} update={update} />
    </ContentPage>
  )
}
