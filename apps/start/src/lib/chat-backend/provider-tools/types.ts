import type { ToolSet } from 'ai'
import type {
  CatalogProviderId,
  ProviderToolIdByProvider,
} from '@/lib/ai-catalog/provider-tools'

/**
 * Context passed to provider tool factories so future implementations can
 * scope behavior by model, org policy, or request metadata without changing
 * the registry contract.
 */
export type ProviderToolFactoryContext = {
  readonly modelId: string
}

/** Builds one provider-specific tool instance for AI SDK streamText(). */
export type ProviderToolFactory = (
  context: ProviderToolFactoryContext,
) => ToolSet[string] | undefined

/** Tool resolver contract for one provider. */
export type ProviderToolRegistry<
  TProviderId extends CatalogProviderId,
> = {
  readonly byId?: Partial<
    Record<ProviderToolIdByProvider[TProviderId], ProviderToolFactory>
  >
  readonly resolve?: (
    toolId: ProviderToolIdByProvider[TProviderId],
    context: ProviderToolFactoryContext,
  ) => ToolSet[string] | undefined
}
