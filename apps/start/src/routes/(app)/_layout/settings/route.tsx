import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_layout/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <Outlet />
    </div>
  )
}
