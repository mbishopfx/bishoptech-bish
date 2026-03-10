import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SignInPage, getRedirectTarget } from '@/components/auth/sign-in'

export const Route = createFileRoute('/auth/sign-in')({
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
