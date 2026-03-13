'use client'

import { ContentPage } from '@/components/layout'
import { ByokForm } from '@/components/organization/settings/byok'
import { useOrgFeatureAccess } from '@/lib/frontend/billing/use-org-billing'
import { useByok } from '@/lib/frontend/byok/use-byok'
import { m } from '@/paraglide/messages.js'

/**
 * Organization settings page for BYOK (Bring Your Own Key): manage
 * provider API keys stored in encrypted org key storage for the current org.
 */
export function ByokPage() {
  const {
    payload,
    loading,
    errorByProvider,
    successByProvider,
    updatingByProvider,
    setProviderKey,
    removeProviderKey,
  } = useByok()
  const featureAccess = useOrgFeatureAccess('byok')

  return (
    <ContentPage
      title={m.org_byok_page_title()}
      description={m.org_byok_page_description()}
    >
      {loading && (
        <p className="text-sm text-foreground-secondary">
          {m.org_byok_loading()}
        </p>
      )}

      <ByokForm
        featureAccess={featureAccess}
        providerKeyStatus={payload.providerKeyStatus}
        errorByProvider={errorByProvider}
        successByProvider={successByProvider}
        loading={loading}
        updatingByProvider={updatingByProvider}
        onSave={setProviderKey}
        onRemove={removeProviderKey}
      />
    </ContentPage>
  )
}
