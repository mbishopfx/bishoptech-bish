import { ANTHROPIC_PROVIDER_TOOLS } from './anthropic'
import { GOOGLE_PROVIDER_TOOLS } from './google'
import { OPENAI_PROVIDER_TOOLS } from './openai'
import type { ProviderToolDefinition } from './types'

export const PROVIDER_TOOLS = {
  openai: OPENAI_PROVIDER_TOOLS,
  anthropic: ANTHROPIC_PROVIDER_TOOLS,
  google: GOOGLE_PROVIDER_TOOLS,
} as const

export function getProviderToolDefinition(
  providerId: string,
  toolId: string,
): ProviderToolDefinition | undefined {
  const tools = PROVIDER_TOOLS[providerId as keyof typeof PROVIDER_TOOLS]
  if (!tools) return undefined
  return tools.find((tool) => tool.id === toolId)
}
