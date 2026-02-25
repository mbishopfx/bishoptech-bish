import { isReasoningUIPart } from 'ai'
import type { AssistantDecoratorRenderer } from '../types'
import { ReasoningCollapsible } from '../components/reasoning-collapsible'

function renderReasoningDecorator({
  parts,
  isMessageStreaming,
}: Parameters<AssistantDecoratorRenderer['render']>[0]) {
  const reasoningParts = parts.filter(isReasoningUIPart)
  if (reasoningParts.length === 0) return null

  const reasoningText = reasoningParts
    .map((part) => part.text)
    .filter((text) => text.trim().length > 0)
    .join('\n\n')

  if (!reasoningText) return null

  const reasoningIsStreaming =
    isMessageStreaming ||
    reasoningParts.some((part) => part.state === 'streaming')

  return (
    <ReasoningCollapsible
      reasoningText={reasoningText}
      isStreaming={reasoningIsStreaming}
    />
  )
}

/**
 * Ordered message-level registry.
 * Add/remove decorators here to control high-level assistant sections without
 * changing message row composition.
 */
export const assistantDecorators: readonly AssistantDecoratorRenderer[] = [
  {
    id: 'reasoning',
    render: renderReasoningDecorator,
  },
]
