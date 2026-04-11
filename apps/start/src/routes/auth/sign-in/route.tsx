import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { SignInPage, getRedirectTarget } from '@/components/auth/sign-in'
import { isSelfHosted } from '@/utils/app-feature-flags'

export const Route = createFileRoute('/auth/sign-in')({
  beforeLoad: async () => {
    if (!isSelfHosted) {
      return
    }

    const { getInstanceEnvironmentSnapshot } = await import(
      '@/lib/frontend/self-host/instance.functions'
    )
    const snapshot = await getInstanceEnvironmentSnapshot()

    if (!snapshot.setupComplete) {
      throw redirect({ to: '/setup' })
    }
  },
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: SignInRouteComponent,
})

function SignInRouteComponent() {
  const search = Route.useSearch()
  const redirectTarget = getRedirectTarget(search.redirect)
  return <SignInPage redirectTarget={redirectTarget} initialMode="sign-in" />
}
