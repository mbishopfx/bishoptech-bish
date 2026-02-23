import { createFileRoute } from '@tanstack/react-router'
import { getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start'
import { Form } from '@rift/ui/form'
import { useEffect, useState } from 'react'
import { ContentPage } from '@/components/layout'
import { DebugAuth } from '@/components/settings/debug-auth'

const DEBUG_LABEL_STORAGE_KEY = 'rift-debug-auth-label'
const DEBUG_WEBSITE_STORAGE_KEY = 'rift-debug-auth-website'
const DEBUG_SIZE_KEY = 'rift-debug-auth-size'
const WEBSITE_PREFIX = 'https://www.'

export const Route = createFileRoute('/(app)/_layout/settings/debug-auth')({
  loader: async () => {
    const signInUrl = await getSignInUrl()
    const signUpUrl = await getSignUpUrl()
    return { signInUrl, signUpUrl }
  },
  component: DebugAuthPage,
})

function DebugAuthPage() {
  const { signInUrl, signUpUrl } = Route.useLoaderData()
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
      title="Debug Auth"
      description="Session and user info for development and troubleshooting."
    >
      <DebugAuth signInUrl={signInUrl} signUpUrl={signUpUrl} />

      <Form
        title="Debug label"
        description="Optional label stored in localStorage. Useful for testing the settings form component."
        inputAttrs={{
          name: 'debugLabel',
          type: 'text',
          placeholder: 'e.g. My test session',
        }}
        value={defaultLabel}
        onValueChange={setDefaultLabel}
        helpText="Value is saved in your browser only."
        buttonText="Save"
        handleSubmit={async (data) => {
          const value = data.debugLabel ?? ''
          if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_LABEL_STORAGE_KEY, value)
            setDefaultLabel(value)
          }
        }}
      />

      <Form
        title="Demo website URL"
        description="Example of a form field with a fixed prefix. The full URL (prefix + value) is saved in localStorage."
        inputAttrs={{
          name: 'website',
          type: 'text',
          placeholder: 'example.com',
        }}
        inputPrefix={WEBSITE_PREFIX}
        value={defaultWebsite}
        onValueChange={setDefaultWebsite}
        helpText="Full URL is saved in your browser only."
        buttonText="Save"
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
        title="Demo select"
        description="Example of a form that uses the Select component. Value is saved in localStorage."
        selectConfig={{
          name: 'size',
          options: [
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ],
        }}
        value={defaultSize}
        onValueChange={setDefaultSize}
        helpText="Saved in your browser only."
        buttonText="Save"
        handleSubmit={async (data) => {
          const value = data.size ?? 'medium'
          if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_SIZE_KEY, value)
            setDefaultSize(value)
          }
        }}
      />

      <Form
        title="Demo form with toggle section"
        description="Example of a form card with only a toggle section (Add-Ons style): left-aligned text, optional pricing, toggle on the right."
        toggleSection={{
          sectionTitle: 'Add-Ons',
          items: [
            {
              id: 'speed-insights',
              title: 'Speed Insights',
              description:
                "Detailed view of your website's performance metrics, facilitating informed decisions for its optimization.",
              learnMoreHref: 'https://example.com/docs/speed-insights',
              checked: speedInsightsOn,
              onCheckedChange: setSpeedInsightsOn,
            },
            {
              id: 'observability-plus',
              title: 'Observability Plus',
              description:
                "Gain comprehensive visibility into your application's health and performance.",
              learnMoreHref: 'https://example.com/docs/observability',
              price: '$10 / month',
              priceSub: '+ $1.20/1M events',
              checked: observabilityOn,
              onCheckedChange: setObservabilityOn,
            },
          ],
        }}
        helpText="Toggles are for demo only; state is not persisted."
      />
    </ContentPage>
  )
}
