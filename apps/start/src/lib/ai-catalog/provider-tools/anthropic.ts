import type { ProviderToolDefinition } from './types'

type AnthropicToolFamily =
  | 'web_search'
  | 'web_fetch'
  | 'computer'
  | 'text_editor'
  | 'code_execution'

/**
 * Anthropic tool ids are versioned by suffix (typically a date-like number),
 * e.g. `web_fetch_20250910`.
 */
export type AnthropicProviderToolId = `${AnthropicToolFamily}_${number}`

/**
 * Anthropic's dynamic web-search and web-fetch revisions require code
 * execution at runtime. We keep the downgrade rule in one provider-specific
 * helper so catalog, policy, and runtime layers do not each duplicate the
 * same dependency logic.
 */
export function resolveAnthropicRuntimeToolIds(
  toolIds: readonly AnthropicProviderToolId[],
): readonly AnthropicProviderToolId[] {
  const hasDynamicWebSearch = toolIds.includes('web_search_20260209')
  const hasDynamicWebFetch = toolIds.includes('web_fetch_20260209')
  const hasCodeExecution = toolIds.some((toolId) =>
    toolId.startsWith('code_execution_'),
  )

  if ((!hasDynamicWebSearch && !hasDynamicWebFetch) || hasCodeExecution) {
    return toolIds
  }

  const runtimeToolIds = new Set<AnthropicProviderToolId>()

  for (const toolId of toolIds) {
    if (toolId === 'web_search_20260209') {
      runtimeToolIds.add('web_search_20250305')
      continue
    }
    if (toolId === 'web_fetch_20260209') {
      runtimeToolIds.add('web_fetch_20250910')
      continue
    }

    runtimeToolIds.add(toolId)
  }

  return [...runtimeToolIds]
}

export function isAnthropicCodeExecutionToolId(
  toolId: string,
): toolId is AnthropicProviderToolId {
  return toolId.startsWith('code_execution_')
}

/**
 * Derives UI/policy metadata for Anthropic tools from the tool family prefix,
 * so only the model catalog needs to pin exact version ids.
 */
export function getAnthropicProviderToolDefinition(
  toolId: AnthropicProviderToolId,
): ProviderToolDefinition | undefined {
  if (toolId.startsWith('web_search_')) {
    return {
      id: toolId,
      advanced: false,
    }
  }

  if (toolId.startsWith('web_fetch_')) {
    return {
      id: toolId,
      advanced: false,
    }
  }

  if (toolId.startsWith('code_execution_')) {
    return {
      id: toolId,
      advanced: true,
    }
  }

  if (toolId.startsWith('computer_')) {
    return {
      id: toolId,
      advanced: true,
    }
  }

  if (toolId.startsWith('text_editor_')) {
    return {
      id: toolId,
      advanced: true,
    }
  }

  return undefined
}
