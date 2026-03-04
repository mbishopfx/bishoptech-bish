import { betterAuth } from 'better-auth'
import { anonymous } from 'better-auth/plugins/anonymous'
import { organization } from 'better-auth/plugins/organization'
import { Pool } from 'pg'

const connectionString = process.env.ZERO_UPSTREAM_DB
const pool = connectionString ? new Pool({ connectionString }) : null

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

/**
 * Better Auth is the only identity provider used by the app.
 * Database uses direct `pg.Pool` integration to avoid Kysely adapter requirements.
 */
export const auth = betterAuth({
  appName: 'Rift',
  baseURL: process.env.BETTER_AUTH_URL?.trim() || 'http://localhost:3000',
  basePath: '/api/auth',
  ...(process.env.BETTER_AUTH_SECRET
    ? { secret: process.env.BETTER_AUTH_SECRET }
    : {}),
  ...(pool
    ? { database: pool }
    : {}),
  emailAndPassword: {
    enabled: true,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    anonymous({
      generateName: () => 'Guest User',
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Reassign app-owned rows so guest chat history survives account upgrade.
        if (!pool) return
        const fromUserId = anonymousUser.user.id
        const toUserId = newUser.user.id
        const client = await pool.connect()

        try {
          await client.query('BEGIN')
          await client.query('UPDATE threads SET user_id = $1 WHERE user_id = $2', [
            toUserId,
            fromUserId,
          ])
          await client.query('UPDATE messages SET user_id = $1 WHERE user_id = $2', [
            toUserId,
            fromUserId,
          ])
          await client.query('UPDATE attachments SET user_id = $1 WHERE user_id = $2', [
            toUserId,
            fromUserId,
          ])
          await client.query('COMMIT')
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      },
    }),
  ],
})
