import { createFileRoute, redirect } from '@tanstack/react-router'
import { isSelfHosted } from '@/utils/app-feature-flags'

export const Route = createFileRoute('/(app)/_layout/')({
  beforeLoad: async ({ location }) => {
    /**
     * Self-hosted deployments should feel private from the first URL hit. This
     * route-level redirect avoids bouncing unauthenticated visitors through the
     * chat shell before the auth gate resolves.
     */
    if (isSelfHosted) {
      const { getSelfHostedAppAccessSnapshot } = await import(
        '@/lib/frontend/self-host/instance.functions'
      )
      const snapshot = await getSelfHostedAppAccessSnapshot()

      if (!snapshot.setupComplete) {
        throw redirect({ to: '/setup' })
      }

      if (
        snapshot.publicAppLocked &&
        (!snapshot.hasAuthenticatedUser || snapshot.isAnonymous)
      ) {
        throw redirect({
          to: '/auth/sign-in',
          search: {
            redirect: location.pathname,
          },
        })
      }
    }

    throw redirect({ to: '/chat' })
  },
})
