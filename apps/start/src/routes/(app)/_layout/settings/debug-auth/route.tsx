import { createFileRoute } from '@tanstack/react-router'
import { Form } from '@rift/ui/form'
import { useEffect, useState } from 'react'
import { ContentPage } from '@/components/layout'
import { DebugAuth } from '@/components/settings/debug-auth'
import { m } from '@/paraglide/messages.js'

const DEBUG_LABEL_STORAGE_KEY = 'rift-debug-auth-label'
const DEBUG_WEBSITE_STORAGE_KEY = 'rift-debug-auth-website'
const DEBUG_SIZE_KEY = 'rift-debug-auth-size'
const WEBSITE_PREFIX = 'https://www.'

export const Route = createFileRoute('/(app)/_layout/settings/debug-auth')({
  component: DebugAuthPage,
})

function DebugAuthPage() {
  const signInUrl = '/auth/sign-in'
  const signUpUrl = '/auth/sign-up'
  const [defaultLabel, setDefaultLabel] = useState('')
  const [defaultWebsite, setDefaultWebsite] = useState('')
  const [defaultSize, setDefaultSize] = useState('medium')
  const [speedInsightsOn, setSpeedInsightsOn] = useState(false)
  const [observabilityOn, setObservabilityOn] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDefaultLabel(localStorage.getItem(DEBUG_LABEL_STORAGE_KEY) ?? '')
    const full = localStorage.getItem(DEBUG_WEBSITE_STORAGE_KEY) ?? ''
    setDefaultWebsite(
      full.startsWith(WEBSITE_PREFIX) ? full.slice(WEBSITE_PREFIX.length) : full,
    )
    setDefaultSize(localStorage.getItem(DEBUG_SIZE_KEY) ?? 'medium')
  }, [])

  return (
    <ContentPage
      title={m.debug_auth_page_title()}
      description={m.debug_auth_page_description()}
    >
      <DebugAuth signInUrl={signInUrl} signUpUrl={signUpUrl} />

      <Form
        title={m.debug_auth_label_title()}
        description={m.debug_auth_label_description()}
        inputAttrs={{
          name: 'debugLabel',
          type: 'text',
          placeholder: m.debug_auth_label_placeholder(),
        }}
        value={defaultLabel}
        onValueChange={setDefaultLabel}
        helpText={m.debug_auth_value_saved_browser_only()}
        buttonText={m.app_save()}
        handleSubmit={async (data) => {
          const value = data.debugLabel ?? ''
          if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_LABEL_STORAGE_KEY, value)
            setDefaultLabel(value)
          }
        }}
      />

      <Form
        title={m.debug_auth_website_title()}
        description={m.debug_auth_website_description()}
        inputAttrs={{
          name: 'website',
          type: 'text',
          placeholder: m.debug_auth_website_placeholder(),
        }}
        inputPrefix={WEBSITE_PREFIX}
        value={defaultWebsite}
        onValueChange={setDefaultWebsite}
        helpText={m.debug_auth_full_url_saved_browser_only()}
        buttonText={m.app_save()}
        handleSubmit={async (data) => {
          const fullUrl = data.website ?? ''
          if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_WEBSITE_STORAGE_KEY, fullUrl)
            setDefaultWebsite(
              fullUrl.startsWith(WEBSITE_PREFIX)
                ? fullUrl.slice(WEBSITE_PREFIX.length)
                : fullUrl,
            )
          }
        }}
      />

      <Form
        title={m.debug_auth_select_title()}
        description={m.debug_auth_select_description()}
        selectConfig={{
          name: 'size',
          options: [
            { value: 'small', label: m.debug_auth_select_size_small() },
            { value: 'medium', label: m.debug_auth_select_size_medium() },
            { value: 'large', label: m.debug_auth_select_size_large() },
          ],
        }}
        value={defaultSize}
        onValueChange={setDefaultSize}
        helpText={m.debug_auth_saved_browser_only()}
        buttonText={m.app_save()}
        handleSubmit={async (data) => {
          const value = data.size ?? 'medium'
          if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_SIZE_KEY, value)
            setDefaultSize(value)
          }
        }}
      />

      <Form
        title={m.debug_auth_toggle_demo_title()}
        description={m.debug_auth_toggle_demo_description()}
        toggleSection={{
          sectionTitle: m.debug_auth_toggle_section_title(),
          items: [
            {
              id: 'speed-insights',
              title: m.debug_auth_toggle_speed_insights_title(),
              description: m.debug_auth_toggle_speed_insights_description(),
              learnMoreHref: 'https://example.com/docs/speed-insights',
              checked: speedInsightsOn,
              onCheckedChange: setSpeedInsightsOn,
            },
            {
              id: 'observability-plus',
              title: m.debug_auth_toggle_observability_plus_title(),
              description: m.debug_auth_toggle_observability_plus_description(),
              learnMoreHref: 'https://example.com/docs/observability',
              price: m.debug_auth_toggle_observability_price(),
              priceSub: m.debug_auth_toggle_observability_price_sub(),
              checked: observabilityOn,
              onCheckedChange: setObservabilityOn,
            },
          ],
        }}
        helpText={m.debug_auth_toggle_demo_help()}
      />
    </ContentPage>
  )
}
