import type { ProviderToolDefinition } from './types'

export const XAI_PROVIDER_TOOLS = [
  {
    id: 'web_search',
    advanced: false,
  },
  {
    id: 'x_search',
    advanced: false,
  },
  {
    id: 'code_execution',
    advanced: true,
  },
  {
    id: 'view_image',
    advanced: true,
  },
  {
    id: 'view_x_video',
    advanced: true,
  },
] as const satisfies readonly ProviderToolDefinition[]

export type XaiProviderToolId = (typeof XAI_PROVIDER_TOOLS)[number]['id']
