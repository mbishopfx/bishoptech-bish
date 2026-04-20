import { createFileRoute, redirect } from '@tanstack/react-router'
import { BishOperatorPage } from '@/components/operator/bish-operator-page'
import { getBishOperatorSnapshot } from '@/lib/frontend/bish/bish.functions'

export const Route = createFileRoute('/(app)/_layout/operator')({
  loader: async () => {
    try {
      return await getBishOperatorSnapshot()
    } catch {
      throw redirect({ to: '/' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <BishOperatorPage snapshot={snapshot} />
}
