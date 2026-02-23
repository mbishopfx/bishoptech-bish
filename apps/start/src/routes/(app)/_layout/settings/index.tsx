import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/layout'

export const Route = createFileRoute('/(app)/_layout/settings/')({
  component: SettingsAccountPage,
})

function SettingsAccountPage() {
  return (
    <ContentPage
      title="Account"
      description="Account settings will go here."
    />
  )
}
