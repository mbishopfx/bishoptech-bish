'use client'

import type { PluginConfig } from 'streamdown'

/**
 * Rich math and Mermaid plugins pull in very large optional bundles. Railway's
 * production build window is currently too tight for that dependency graph, so
 * self-hosted v1 keeps Streamdown on its core markdown renderer only.
 *
 * Returning `undefined` preserves the existing renderer contract while keeping
 * the optional plugin stack entirely out of the production bundle. Once the
 * deployment path is lighter, this hook is the single place to reintroduce the
 * deferred plugin loader.
 */
export function useStreamdownPlugins(): PluginConfig | undefined {
  return undefined
}
