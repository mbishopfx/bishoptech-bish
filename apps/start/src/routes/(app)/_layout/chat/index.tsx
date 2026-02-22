import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/_layout/chat/')({
  component: ChatPage,
})

// New chat page (no thread yet). The shared chat shell renders in the parent layout.
function ChatPage() {
  return null
}
