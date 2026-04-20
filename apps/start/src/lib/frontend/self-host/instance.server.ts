import { Effect } from 'effect'
import { splitSetCookieString } from 'cookie-es'
import { setResponseHeader } from '@tanstack/start-server-core'
import { auth } from '@/lib/backend/auth/services/auth.service'
import { isUploadStorageConfigured } from '@/lib/backend/upload/storage-config'
import { getZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { getServerAuthContext } from '@/lib/backend/server-effect/http/server-auth'
import {
  completeSelfHostedSetup,
  getPublicInstanceEnvironmentSnapshot,
  getSelfHostedInstanceSettings,
  getServerInstanceCapabilities,
  verifySelfHostedSetupToken,
  withSelfHostedSetupLock,
} from '@/lib/backend/self-host/instance-settings.service'
import { m } from '@/paraglide/messages.js'
import { isRedisDisabled, isSelfHosted } from '@/utils/app-feature-flags'

type RunSelfHostedSetupInput = {
  readonly setupToken: string
  readonly name: string
  readonly email: string
  readonly password: string
}

async function resolveZeroReplicationHealthStatus() {
  const pool = getZeroUpstreamPool()
  if (!pool) {
    return 'missing' as const
  }

  try {
    const result = await pool.query<{ wal_level: string }>(
      `select current_setting('wal_level') as wal_level`,
    )
    const walLevel = result.rows[0]?.wal_level?.trim().toLowerCase() ?? ''
    return walLevel === 'logical' ? ('enabled' as const) : ('unsupported' as const)
  } catch {
    return 'missing' as const
  }
}

function readUserIdFromAuthResult(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null

  const user = (result as { user?: unknown }).user
  if (!user || typeof user !== 'object') return null

  const userId = (user as { id?: unknown }).id
  return typeof userId === 'string' && userId.trim().length > 0 ? userId : null
}

async function resolveSelfHostedSetupHealth() {
  const capabilities = getServerInstanceCapabilities()
  const redisDisabled = isRedisDisabled
  const connectionString =
    process.env.ZERO_UPSTREAM_DB?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_PUBLIC_URL?.trim() ||
    ''

  return {
    required: [
      {
        id: 'app_url',
        label: 'App URL',
        status: process.env.BETTER_AUTH_URL?.trim() ? 'enabled' : 'missing',
      },
      {
        id: 'auth_secret',
        label: 'Auth secret',
        status: process.env.BETTER_AUTH_SECRET?.trim() ? 'enabled' : 'missing',
      },
      {
        id: 'postgres',
        label: 'Postgres',
        status: connectionString ? 'enabled' : 'missing',
      },
      {
        id: 'zero_logical_replication',
        label: 'Zero logical replication',
        status: await resolveZeroReplicationHealthStatus(),
      },
      {
        id: 'redis',
        label: 'Redis',
        status: redisDisabled
          ? 'disabled'
          : process.env.REDIS_URL?.trim()
            ? 'enabled'
            : 'missing',
      },
      {
        id: 'bucket',
        label: 'Object storage',
        status: isUploadStorageConfigured() ? 'enabled' : 'missing',
      },
      {
        id: 'setup_token',
        label: 'Setup token',
        status: capabilities.setupTokenConfigured ? 'enabled' : 'missing',
      },
    ],
    optional: [
      {
        id: 'markdown_worker',
        label: 'Markdown worker',
        status: capabilities.markdownWorkerAvailable ? 'enabled' : 'optional_missing',
      },
      {
        id: 'posthog',
        label: 'PostHog',
        status: 'not_available_in_self_host',
      },
      {
        id: 'stripe',
        label: 'Stripe billing',
        status: 'not_available_in_self_host',
      },
      {
        id: 'resend',
        label: 'Resend email',
        status: 'not_available_in_self_host',
      },
      {
        id: 'social_auth',
        label: 'Social sign-in',
        status: 'not_available_in_self_host',
      },
    ],
  }
}

async function assertSelfHostedSetupPending(): Promise<void> {
  if (!isSelfHosted) {
    throw new Error(m.setup_error_only_self_hosted())
  }

  const settings = await getSelfHostedInstanceSettings()
  if (settings.setupCompletedAt != null) {
    throw new Error(m.setup_error_completed())
  }
}

function assertSetupTokenConfigured(): void {
  if (!getServerInstanceCapabilities().setupTokenConfigured) {
    throw new Error(m.setup_error_token_not_configured())
  }
}

/**
 * Returns the public deployment snapshot plus setup diagnostics for the setup
 * and auth routes. The diagnostics are computed from environment state only,
 * while the mutable setup status comes from the cached singleton row.
 */
export async function getInstanceEnvironmentSnapshotAction() {
  const snapshot = await getPublicInstanceEnvironmentSnapshot()

  return {
    ...snapshot,
    setupHealth: await resolveSelfHostedSetupHealth(),
  }
}

/**
 * App-shell gating only needs auth/session context when the self-hosted
 * instance keeps the public app locked. Cloud and unlocked self-hosted modes
 * can skip the extra session read entirely.
 */
export async function getSelfHostedAppAccessSnapshotAction() {
  const snapshot = await getPublicInstanceEnvironmentSnapshot()

  if (snapshot.instanceMode !== 'self_hosted' || !snapshot.publicAppLocked) {
    return {
      ...snapshot,
      hasAuthenticatedUser: false,
      isAnonymous: false,
    }
  }

  const authContext = await Effect.runPromise(getServerAuthContext())

  return {
    ...snapshot,
    hasAuthenticatedUser: Boolean(authContext.userId),
    isAnonymous: authContext.isAnonymous,
  }
}

/**
 * Step one of bootstrap setup validates the shared deployment token before the
 * UI collects the first admin credentials.
 */
export async function verifySelfHostedSetupAccessAction(input: {
  readonly setupToken: string
}) {
  await assertSelfHostedSetupPending()
  assertSetupTokenConfigured()

  if (!verifySelfHostedSetupToken(input.setupToken)) {
    throw new Error(m.setup_error_invalid_token())
  }

  return {
    ok: true,
  }
}

/**
 * Claims the deployment and creates the first admin account. The advisory lock
 * prevents concurrent setup submissions from provisioning multiple bootstrap
 * users before the instance row is marked complete.
 */
export async function runSelfHostedSetupAction(
  input: RunSelfHostedSetupInput,
) {
  return withSelfHostedSetupLock(async () => {
    await assertSelfHostedSetupPending()
    assertSetupTokenConfigured()

    if (!verifySelfHostedSetupToken(input.setupToken)) {
      throw new Error(m.setup_error_invalid_token())
    }

    const result = await auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
      headers: new Headers({
        'x-bish-setup-token': input.setupToken,
      }),
    })

    const userId = readUserIdFromAuthResult(result)
    if (!userId) {
      throw new Error(m.setup_error_finish())
    }

    await completeSelfHostedSetup({
      firstAdminUserId: userId,
      signupPolicy: 'invite_only',
      publicAppLocked: true,
    })

    const signInResult = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
      headers: new Headers(),
      returnHeaders: true,
    })

    const setCookieHeader = signInResult.headers.get('set-cookie')
    if (!setCookieHeader) {
      throw new Error(m.setup_error_finish())
    }

    setResponseHeader('set-cookie', splitSetCookieString(setCookieHeader))

    return {
      ok: true,
    }
  })
}
