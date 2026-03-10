import { createFileRoute } from '@tanstack/react-router'
import { InsightPage } from '@/components/insight'

export const Route = createFileRoute('/(app)/_layout/insight')({
  component: InsightRoute,
})

function InsightRoute() {
  return <InsightPage />
}
