import { createFileRoute } from '@tanstack/react-router'
import { BishOperatorPage } from '@/components/operator/bish-operator-page'
import { getBishOperatorSnapshot } from '@/lib/frontend/bish/bish.functions'

export const Route = createFileRoute('/(app)/_layout/operator/platform')({
  loader: () => getBishOperatorSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <BishOperatorPage snapshot={snapshot} />
}
