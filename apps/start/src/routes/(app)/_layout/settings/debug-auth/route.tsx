import { createFileRoute } from '@tanstack/react-router'
import { getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start'
import { Form } from '@rift/ui/form'
import { useEffect, useState } from 'react'
import { ContentPage } from '@/components/layout'
import { DebugAuth } from '@/components/settings/debug-auth'

const DEBUG_LABEL_STORAGE_KEY = 'rift-debug-auth-label'
const DEBUG_WEBSITE_STORAGE_KEY = 'rift-debug-auth-website'
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDefaultLabel(localStorage.getItem(DEBUG_LABEL_STORAGE_KEY) ?? '')
    const full = localStorage.getItem(DEBUG_WEBSITE_STORAGE_KEY) ?? ''
    setDefaultWebsite(
      full.startsWith(WEBSITE_PREFIX) ? full.slice(WEBSITE_PREFIX.length) : full,
    )
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
          defaultValue: defaultLabel,
          placeholder: 'e.g. My test session',
        }}
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
          defaultValue: defaultWebsite,
          placeholder: 'example.com',
        }}
        inputPrefix={WEBSITE_PREFIX}
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
    </ContentPage>
  )
}
