import { google } from '@ai-sdk/google'
import type { ProviderToolRegistry } from './types'

/** Google provider-executed tool factories. */
export const GOOGLE_PROVIDER_TOOL_REGISTRY: ProviderToolRegistry<'google'> = {
  byId: {
    google_search: () => google.tools.googleSearch({}),
    code_execution: () => google.tools.codeExecution({}),
    url_context: () => google.tools.urlContext({}),
    google_maps: () => google.tools.googleMaps({}),
  },
}
