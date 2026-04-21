import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  isGuestAccessEnabled,
  isSelfHosted,
} from '@/utils/app-feature-flags'

export const Route = createFileRoute('/(app)/_layout/')({
  beforeLoad: async ({ location }) => {
    const { getAppAccessSnapshot } = await import(
      '@/lib/frontend/self-host/instance.functions'
    )
    const snapshot = await getAppAccessSnapshot()

    if (isSelfHosted && !snapshot.setupComplete) {
      throw redirect({ to: '/setup' })
    }

    const requiresSignIn =
      (isSelfHosted && snapshot.publicAppLocked) || !isGuestAccessEnabled

    if (
      requiresSignIn &&
      (!snapshot.hasAuthenticatedUser || snapshot.isAnonymous)
    ) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: location.pathname,
        },
      })
    }

    throw redirect({ to: '/chat' })
  },
})
