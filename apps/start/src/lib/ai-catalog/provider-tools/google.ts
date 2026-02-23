import type { ProviderToolDefinition } from './types'

export const GOOGLE_PROVIDER_TOOLS: readonly ProviderToolDefinition[] = [
  {
    id: 'google_search',
    name: 'Google Search',
    description: 'Performs grounded Google web search.',
    advanced: false,
  },
  {
    id: 'code_execution',
    name: 'Code Execution',
    description: 'Runs sandboxed code for numeric and data tasks.',
    advanced: true,
  },
]
