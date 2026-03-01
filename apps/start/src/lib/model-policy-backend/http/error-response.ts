import type { OrgModelPolicyDomainError } from '../domain/errors'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Converts typed org model-policy domain errors into stable API responses.
 */
export function toOrgModelPolicyErrorResponse(
  error: unknown,
  fallbackRequestId: string,
): Response {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('_tag' in error) ||
    typeof error._tag !== 'string'
  ) {
    return jsonResponse(
      {
        error: 'Model policy route failed unexpectedly',
        requestId: fallbackRequestId,
      },
      500,
    )
  }

  const tagged = error as OrgModelPolicyDomainError
  const requestId =
    'requestId' in tagged && typeof tagged.requestId === 'string'
      ? tagged.requestId
      : fallbackRequestId

  if (tagged._tag === 'OrgModelPolicyUnauthorizedError') {
    return jsonResponse({ error: tagged.message, requestId }, 401)
  }

  if (
    tagged._tag === 'OrgModelPolicyMissingOrgContextError' ||
    tagged._tag === 'OrgModelPolicyInvalidRequestError'
  ) {
    return jsonResponse(
      {
        error: tagged.message,
        requestId,
        details: 'details' in tagged ? tagged.details : undefined,
      },
      400,
    )
  }

  if (tagged._tag === 'OrgModelPolicyPersistenceError') {
    return jsonResponse({ error: tagged.message, requestId }, 500)
  }

  return jsonResponse(
    { error: 'Model policy route failed unexpectedly', requestId },
    500,
  )
}
