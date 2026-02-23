import type { ProviderToolDefinition } from './types'

export const ANTHROPIC_PROVIDER_TOOLS: readonly ProviderToolDefinition[] = [
  {
    id: 'web_fetch',
    name: 'Web Fetch',
    description: 'Retrieves and summarizes remote web pages.',
    advanced: false,
  },
  {
    id: 'computer_use',
    name: 'Computer Use',
    description: 'Executes interactive computer-control actions.',
    advanced: true,
  },
]
