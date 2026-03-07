'use client'

import { Form } from '@rift/ui/form'
import { ContentPage } from '@/components/layout'
import { m } from '@/paraglide/messages.js'

const CONTACT_EMAIL_HREF = 'mailto:enterprise@rift.mx'
const DOMAINS_ACTION_HREF = '#'
const SSO_ACTION_HREF = '#'
const DIRECTORY_ACTION_HREF = '#'

export function OrgSecurityPage() {
  return (
    <ContentPage
      title={m.org_security_page_title()}
      description={m.org_security_page_description()}
    >
      <Form
        title={m.org_security_domains_title()}
        description={m.org_security_domains_description()}
        contentSlot={
          <p className="text-sm text-content-subtle">
            {m.org_security_domains_status_empty()}
          </p>
        }
        forceActions
        buttonText={m.org_security_domains_add_button()}
        buttonDisabled
        handleSubmit={async () => {
          window.open(DOMAINS_ACTION_HREF, '_blank')
        }}
        helpText={m.org_security_contact_help()}
        helpLearnMoreHref={CONTACT_EMAIL_HREF}
        helpLearnMoreLabel={m.org_analytics_section_contact_link()}
      />

      <Form
        title={m.org_security_sso_title()}
        description={m.org_security_sso_description()}
        contentSlot={
          <p className="text-sm text-content-subtle">
            {m.org_security_sso_status_empty()}
          </p>
        }
        forceActions
        buttonText={m.org_security_sso_setup_button()}
        buttonDisabled
        handleSubmit={async () => {
          window.open(SSO_ACTION_HREF, '_blank')
        }}
        helpText={m.org_security_contact_help()}
        helpLearnMoreHref={CONTACT_EMAIL_HREF}
        helpLearnMoreLabel={m.org_analytics_section_contact_link()}
      />

      <Form
        title={m.org_security_directory_title()}
        description={m.org_security_directory_description()}
        contentSlot={
          <p className="text-sm text-content-subtle">
            {m.org_security_directory_status_empty()}
          </p>
        }
        forceActions
        buttonText={m.org_security_directory_setup_button()}
        buttonDisabled
        handleSubmit={async () => {
          window.open(DIRECTORY_ACTION_HREF, '_blank')
        }}
        helpText={m.org_security_contact_help()}
        helpLearnMoreHref={CONTACT_EMAIL_HREF}
        helpLearnMoreLabel={m.org_analytics_section_contact_link()}
      />
    </ContentPage>
  )
}
