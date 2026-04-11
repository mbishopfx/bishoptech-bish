import { afterEach, describe, expect, it, vi } from 'vitest'

type LoadSelfHostServiceOptions = {
  readonly selfHosted: boolean
  readonly row?: {
    readonly setup_completed_at: Date | string | null
    readonly first_admin_user_id: string | null
    readonly signup_policy: 'invite_only' | 'shared_secret' | 'open'
    readonly signup_secret_hash: string | null
    readonly public_app_locked: boolean
  }
}

async function loadSelfHostService(options: LoadSelfHostServiceOptions) {
  vi.resetModules()

  const query = vi.fn(async (sql: string) => {
    if (sql.includes('select')) {
      return {
        rows: [
          options.row ?? {
            setup_completed_at: null,
            first_admin_user_id: null,
            signup_policy: 'invite_only' as const,
            signup_secret_hash: null,
            public_app_locked: true,
          },
        ],
      }
    }

    return { rows: [] }
  })

  vi.doMock('@/utils/app-feature-flags', () => ({
    isSelfHosted: options.selfHosted,
  }))
  vi.doMock('@/lib/backend/auth/infra/auth-pool', () => ({
    authPool: {
      query,
    },
  }))

  const mod = await import('./instance-settings.service')

  return {
    mod,
    query,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.clearAllMocks()
})

describe('instance-settings.service', () => {
  it('resolves cloud snapshots without loading instance settings from Postgres', async () => {
    vi.stubEnv('POSTHOG_PROJECT_API_KEY', 'phc_test')

    const { mod, query } = await loadSelfHostService({
      selfHosted: false,
    })

    expect(mod.getServerInstanceCapabilities()).toMatchObject({
      instanceMode: 'cloud',
      setupTokenConfigured: true,
    })

    await expect(mod.getPublicInstanceEnvironmentSnapshot()).resolves.toMatchObject({
      instanceMode: 'cloud',
      setupComplete: true,
    })

    expect(query).not.toHaveBeenCalled()
  })

  it('derives self-host snapshots from the cached instance settings row', async () => {
    vi.stubEnv('SELF_HOSTED_SETUP_TOKEN', 'claim-me')

    const { mod, query } = await loadSelfHostService({
      selfHosted: true,
      row: {
        setup_completed_at: '2026-04-10T00:00:00.000Z',
        first_admin_user_id: 'user_admin',
        signup_policy: 'invite_only',
        signup_secret_hash: null,
        public_app_locked: true,
      },
    })

    expect(mod.getServerInstanceCapabilities()).toMatchObject({
      instanceMode: 'self_hosted',
      setupTokenConfigured: true,
    })

    await expect(mod.getPublicInstanceEnvironmentSnapshot()).resolves.toMatchObject({
      instanceMode: 'self_hosted',
      setupComplete: true,
      setupTokenConfigured: true,
      signupPolicy: 'invite_only',
      publicAppLocked: true,
    })

    expect(query).toHaveBeenCalled()
  })

  it('hashes and verifies shared signup secrets safely', async () => {
    const { mod } = await loadSelfHostService({
      selfHosted: true,
    })

    const hash = mod.hashSelfHostedSignupSecret('s3cret-value')

    expect(mod.verifySelfHostedSignupSecret({
      secret: 's3cret-value',
      hash,
    })).toBe(true)

    expect(mod.verifySelfHostedSignupSecret({
      secret: 'wrong-value',
      hash,
    })).toBe(false)
  })
})
