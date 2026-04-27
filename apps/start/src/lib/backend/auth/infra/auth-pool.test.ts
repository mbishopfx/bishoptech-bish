import { describe, expect, it } from 'vitest'
import { createKyselyAdapter } from '@better-auth/kysely-adapter'
import { Pool } from 'pg'
import { authPool } from './auth-pool'

describe('authPool', () => {
  it('looks like a pg pool to adapter discovery without forcing initialization', () => {
    expect(authPool).toBeInstanceOf(Pool)
    expect('connect' in authPool).toBe(true)
    expect('query' in authPool).toBe(true)
  })

  it('can be recognized by the Better Auth Kysely adapter', async () => {
    const { kysely, databaseType } = await createKyselyAdapter({
      database: authPool,
    })

    expect(kysely).not.toBeNull()
    expect(databaseType).toBe('postgres')
  })
})
