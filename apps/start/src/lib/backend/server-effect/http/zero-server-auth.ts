import { Effect } from 'effect'
import { requireAppUserAuth } from './server-auth'
import { verifyZeroSelfHostedAccessToken } from '@/lib/backend/zero-auth/zero-self-hosted-token.service'

function readBearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')?.trim()
  if (!authorization) return null

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new Error('Unsupported authorization header for Zero route.')
  }

  const token = match[1]?.trim()
  if (!token) {
    throw new Error('Missing bearer token for Zero route.')
  }

  return token
}

export const requireZeroAppUserAuth = Effect.fn(
  'ServerAuth.requireZeroAppUserAuth',
)(<TUnauthorized>(input: {
  readonly headers: Headers
  readonly onUnauthorized: () => TUnauthorized
}) => {
  /**
   * Zero requests can arrive through a different Railway service/domain than
   * the main web app. In that topology the browser session cookie is not
   * guaranteed to accompany the Zero request, so we prefer an explicit bearer
   * token when present and only fall back to the app cookie/session path when
   * no token was supplied at all.
   */
  const bearerToken = (() => {
    try {
      return readBearerToken(input.headers)
    } catch {
      return ''
    }
  })()

  if (bearerToken === null) {
    return requireAppUserAuth(input)
  }

  if (!bearerToken) {
    return Effect.fail(input.onUnauthorized())
  }

  return Effect.try({
    try: () => verifyZeroSelfHostedAccessToken(bearerToken),
    catch: () => input.onUnauthorized(),
  })
})
