import type { ProviderToolDefinition } from './types'

export const OPENAI_PROVIDER_TOOLS = [
  {
    id: 'web_search',
    advanced: false,
  },
  {
    id: 'code_interpreter',
    advanced: true,
  },
] as const satisfies readonly ProviderToolDefinition[]

export type OpenAiProviderToolId = (typeof OPENAI_PROVIDER_TOOLS)[number]['id']
