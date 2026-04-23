import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import type { Pool } from 'pg'

/**
 * Auth, billing, and organization services all share the same upstream Postgres
 * pool. Keeping the pool in its own module avoids import cycles between Better
 * Auth configuration and the billing synchronization helpers.
 */
export const authPool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = requireZeroUpstreamPool()
    const value = (pool as unknown as Record<PropertyKey, unknown>)[prop]
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(pool)
      : value
  },
})
