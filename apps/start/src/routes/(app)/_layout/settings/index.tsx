import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/components/settings/account'

export const Route = createFileRoute('/(app)/_layout/settings/')({
  component: AccountPage,
})
