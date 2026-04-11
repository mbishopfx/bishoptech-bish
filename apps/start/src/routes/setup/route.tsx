import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPageLayout } from '@/components/auth/auth-page-layout'
import { SetupPage } from '@/components/auth/setup'
import { isSelfHosted } from '@/utils/app-feature-flags'

export const Route = createFileRoute('/setup')({
  loader: async () => {
    if (!isSelfHosted) {
      throw redirect({ to: '/chat' })
    }

    const { getInstanceEnvironmentSnapshot } = await import(
      '@/lib/frontend/self-host/instance.functions'
    )
    const snapshot = await getInstanceEnvironmentSnapshot()

    if (snapshot.setupComplete) {
      throw redirect({ to: '/auth/sign-in' })
    }

    return snapshot
  },
  component: SetupRouteComponent,
})

function SetupRouteComponent() {
  return (
    <AuthPageLayout>
      <SetupPage />
    </AuthPageLayout>
  )
}
