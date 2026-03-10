import type { ProviderToolDefinition } from './types'

export const GOOGLE_PROVIDER_TOOLS = [
  {
    id: 'google_search',
    advanced: false,
  },
  {
    id: 'code_execution',
    advanced: true,
  },
  {
    id: 'url_context',
    advanced: false,
  },
  {
    id: 'google_maps',
    advanced: true,
  },
] as const satisfies readonly ProviderToolDefinition[]

export type GoogleProviderToolId = (typeof GOOGLE_PROVIDER_TOOLS)[number]['id']
