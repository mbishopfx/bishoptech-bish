import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'

const mockCanUseOrganizationProviderKeys = vi.fn(() => true)
const mockGetOrgAiPolicy = vi.fn()
const mockUpsertOrgAiPolicy = vi.fn()
const mockUpsertOrgProviderApiKeyEffect = vi.fn()
const mockDeleteOrgProviderApiKeyEffect = vi.fn()
const mockReadOrgProviderApiKeyStatusEffect = vi.fn()

vi.mock('@/utils/app-feature-flags', () => ({
  get canUseOrganizationProviderKeys() {
    return mockCanUseOrganizationProviderKeys()
  },
}))

vi.mock('@/lib/backend/model-policy/repository', () => ({
  getOrgAiPolicy: mockGetOrgAiPolicy,
  upsertOrgAiPolicy: mockUpsertOrgAiPolicy,
}))

vi.mock('@/lib/backend/byok/infra/provider-key-store', () => ({
  upsertOrgProviderApiKeyEffect: mockUpsertOrgProviderApiKeyEffect,
  deleteOrgProviderApiKeyEffect: mockDeleteOrgProviderApiKeyEffect,
  readOrgProviderApiKeyStatusEffect: mockReadOrgProviderApiKeyStatusEffect,
}))

describe('ByokExecutorService', () => {
  beforeEach(() => {
    mockCanUseOrganizationProviderKeys.mockReset()
    mockGetOrgAiPolicy.mockReset()
    mockUpsertOrgAiPolicy.mockReset()
    mockUpsertOrgProviderApiKeyEffect.mockReset()
    mockDeleteOrgProviderApiKeyEffect.mockReset()
    mockReadOrgProviderApiKeyStatusEffect.mockReset()
  })

  it('sets provider key and updates provider status snapshot', async () => {
    const { ByokExecutorService } = await import('./byok-executor.service')

    mockCanUseOrganizationProviderKeys.mockReturnValue(true)
    mockGetOrgAiPolicy.mockResolvedValue(undefined)
    mockReadOrgProviderApiKeyStatusEffect.mockReturnValue(
      Effect.succeed({
        openai: false,
        anthropic: false,
      }),
    )
    mockUpsertOrgProviderApiKeyEffect.mockReturnValue(Effect.void)
    mockUpsertOrgAiPolicy.mockResolvedValue(undefined)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ByokExecutorService
        return yield* service.executeUpdate('org-1', {
          action: 'set_provider_api_key',
          providerId: 'openai',
          apiKey: 'sk-valid',
        })
      }).pipe(Effect.provide(ByokExecutorService.layer)),
    )

    expect(mockUpsertOrgProviderApiKeyEffect).toHaveBeenCalledWith({
      organizationId: 'org-1',
      providerId: 'openai',
      apiKey: 'sk-valid',
    })
    expect(result.providerKeyStatus).toEqual({
      openai: true,
      anthropic: false,
    })
  })

  it('removes provider key and updates provider status snapshot', async () => {
    const { ByokExecutorService } = await import('./byok-executor.service')

    mockCanUseOrganizationProviderKeys.mockReturnValue(true)
    mockGetOrgAiPolicy.mockResolvedValue(undefined)
    mockReadOrgProviderApiKeyStatusEffect.mockReturnValue(
      Effect.succeed({
        openai: true,
        anthropic: true,
      }),
    )
    mockDeleteOrgProviderApiKeyEffect.mockReturnValue(Effect.void)
    mockUpsertOrgAiPolicy.mockResolvedValue(undefined)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ByokExecutorService
        return yield* service.executeUpdate('org-2', {
          action: 'remove_provider_api_key',
          providerId: 'openai',
        })
      }).pipe(Effect.provide(ByokExecutorService.layer)),
    )

    expect(mockDeleteOrgProviderApiKeyEffect).toHaveBeenCalledWith({
      organizationId: 'org-2',
      providerId: 'openai',
    })
    expect(result.providerKeyStatus).toEqual({
      openai: false,
      anthropic: true,
    })
  })

  it('returns a typed feature-disabled error when BYOK feature flag is off', async () => {
    const { ByokExecutorService } = await import('./byok-executor.service')

    mockCanUseOrganizationProviderKeys.mockReturnValue(false)

    await expect(
      Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* ByokExecutorService
          return yield* service.executeUpdate('org-3', {
            action: 'remove_provider_api_key',
            providerId: 'anthropic',
          })
        }).pipe(Effect.provide(ByokExecutorService.layer)),
      ),
    ).rejects.toMatchObject({
      _tag: 'ByokFeatureDisabledError',
    })
  })
})
