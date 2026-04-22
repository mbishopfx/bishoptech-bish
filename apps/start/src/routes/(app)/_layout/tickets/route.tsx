import { createFileRoute } from '@tanstack/react-router'
import { TicketsPage } from '@/components/workspace-tools/tickets-page'
import { getTicketsSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/tickets')({
  loader: () => getTicketsSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <TicketsPage initialSnapshot={snapshot} />
}
