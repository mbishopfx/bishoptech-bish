import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_layout/chat/$threadId')({
  component: ChatThreadPage,
})

// Existing thread page. The shared chat shell renders in the parent layout.
function ChatThreadPage() {
  return null
}
