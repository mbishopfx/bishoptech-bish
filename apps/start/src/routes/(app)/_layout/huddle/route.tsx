import { createFileRoute } from '@tanstack/react-router'
import { HuddlePage } from '@/components/huddle/huddle-page'

export const Route = createFileRoute('/(app)/_layout/huddle')({
  component: HuddlePage,
})
