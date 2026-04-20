import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AuthenticatedServerAuthContext } from '@/lib/backend/server-effect/http/auth-context'

const ZERO_SELF_HOSTED_TOKEN_AUDIENCE = 'bish-zero'
const ZERO_SELF_HOSTED_TOKEN_VERSION = 1
const TOKEN_TTL_SECONDS = 600
const CLOCK_SKEW_SECONDS = 30

type ZeroSelfHostedAccessTokenClaims = {
  readonly v: 1
  readonly aud: typeof ZERO_SELF_HOSTED_TOKEN_AUDIENCE
  readonly sub: string
  readonly orgId?: string
  readonly anon: false
  readonly iat: number
  readonly exp: number
}

export type ZeroSelfHostedAccessTokenIssueResult = {
  readonly token: string
  readonly expiresAt: string
}

function readSigningSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim()

  if (!secret) {
    throw new Error(
      'Missing BETTER_AUTH_SECRET for self-hosted Zero token signing.',
    )
  }

  return secret
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function signPayload(payloadSegment: string): string {
  return createHmac('sha256', readSigningSecret())
    .update(payloadSegment)
    .digest('base64url')
}

function assertSignature(actual: string, expected: string): void {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid Zero self-hosted token signature.')
  }
}

function parseClaims(raw: string): ZeroSelfHostedAccessTokenClaims {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Malformed Zero self-hosted token payload.')
  }

  const record = parsed as Record<string, unknown>
  const sub = typeof record.sub === 'string' ? record.sub.trim() : ''
  const orgId =
    typeof record.orgId === 'string' && record.orgId.trim().length > 0
      ? record.orgId.trim()
      : undefined
  const iat = typeof record.iat === 'number' ? record.iat : NaN
  const exp = typeof record.exp === 'number' ? record.exp : NaN

  if (
    record.v !== ZERO_SELF_HOSTED_TOKEN_VERSION ||
    record.aud !== ZERO_SELF_HOSTED_TOKEN_AUDIENCE ||
    record.anon !== false ||
    !sub ||
    !Number.isFinite(iat) ||
    !Number.isFinite(exp) ||
    exp <= iat
  ) {
    throw new Error('Invalid Zero self-hosted token claims.')
  }

  return {
    v: 1,
    aud: ZERO_SELF_HOSTED_TOKEN_AUDIENCE,
    sub,
    ...(orgId ? { orgId } : {}),
    anon: false,
    iat,
    exp,
  }
}

export function issueZeroSelfHostedAccessToken(input: {
  readonly userId: string
  readonly organizationId?: string | null
}): ZeroSelfHostedAccessTokenIssueResult {
  const userId = input.userId.trim()
  if (!userId) {
    throw new Error('Cannot issue Zero token without a user id.')
  }

  const organizationId = input.organizationId?.trim() || undefined
  const now = Math.floor(Date.now() / 1000)

  const claims: ZeroSelfHostedAccessTokenClaims = {
    v: 1,
    aud: ZERO_SELF_HOSTED_TOKEN_AUDIENCE,
    sub: userId,
    ...(organizationId ? { orgId: organizationId } : {}),
    anon: false,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }

  const payloadSegment = encodeBase64Url(JSON.stringify(claims))
  const signatureSegment = signPayload(payloadSegment)

  return {
    token: `${payloadSegment}.${signatureSegment}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  }
}

export function verifyZeroSelfHostedAccessToken(
  token: string,
): AuthenticatedServerAuthContext {
  const [payloadSegment, signatureSegment, ...rest] = token.split('.')

  if (!payloadSegment || !signatureSegment || rest.length > 0) {
    throw new Error('Malformed Zero self-hosted token.')
  }

  assertSignature(signatureSegment, signPayload(payloadSegment))

  const claims = parseClaims(decodeBase64Url(payloadSegment))
  const now = Math.floor(Date.now() / 1000)

  if (claims.iat > now + CLOCK_SKEW_SECONDS) {
    throw new Error('Zero self-hosted token was issued in the future.')
  }

  if (claims.exp <= now - CLOCK_SKEW_SECONDS) {
    throw new Error('Zero self-hosted token expired.')
  }

  return {
    userId: claims.sub,
    organizationId: claims.orgId,
    isAnonymous: false,
  }
}
