import { xai } from '@ai-sdk/xai'
import type { ProviderToolRegistry } from './types'

/**
 * xAI tool builders.
 * Keep this list aligned with the provider-tool catalog so policy/UI and
 * runtime execution stay on the same exact set of tool identifiers.
 */
export const XAI_PROVIDER_TOOL_REGISTRY: ProviderToolRegistry<'xai'> = {
  byId: {
    web_search: () => xai.tools.webSearch(),
    x_search: () => xai.tools.xSearch(),
    code_execution: () => xai.tools.codeExecution(),
    view_image: () => xai.tools.viewImage(),
    view_x_video: () => xai.tools.viewXVideo(),
  },
}
