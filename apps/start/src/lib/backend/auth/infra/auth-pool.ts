import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { Pool } from 'pg'

/**
 * Auth, billing, and organization services all share the same upstream Postgres
 * pool. Keeping the pool in its own module avoids import cycles between Better
 * Auth configuration and the billing synchronization helpers.
 *
 * The proxy target intentionally inherits from `Pool.prototype` so adapter
 * discovery that relies on `instanceof Pool` or `"connect" in pool` still
 * recognizes this object as a Postgres pool before the real connection is
 * resolved. The actual pool remains lazy and is only instantiated when a
 * property is read and used.
 */
export const authPool: Pool = new Proxy(Object.create(Pool.prototype) as Pool, {
  get(_target, prop) {
    const pool = requireZeroUpstreamPool()
    const value = (pool as unknown as Record<PropertyKey, unknown>)[prop]
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(pool)
      : value
  },
})
