import type { FileDomainError } from '../domain/errors'

function statusForTag(tag: string): number {
  switch (tag) {
    case 'FileUnauthorizedError':
      return 401
    case 'FileInvalidRequestError':
      return 400
    case 'FileUploadStorageError':
    case 'FileConversionError':
      return 502
    case 'FilePersistenceError':
    case 'FileVectorIndexError':
      return 500
    default:
      return 500
  }
}

export function toFileErrorResponse(
  error: unknown,
  fallbackRequestId: string,
): Response {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    const tagged = error as FileDomainError
    const requestId =
      'requestId' in tagged && typeof tagged.requestId === 'string'
        ? tagged.requestId
        : fallbackRequestId
    const message =
      'message' in tagged && typeof tagged.message === 'string'
        ? tagged.message
        : 'File upload failed'

    const explicitStatus =
      'statusCode' in tagged && typeof tagged.statusCode === 'number'
        ? tagged.statusCode
        : undefined

    return jsonResponse(
      {
        ok: false,
        error: message,
        requestId,
        code: tagged._tag,
      },
      explicitStatus ?? statusForTag(tagged._tag),
    )
  }

  return jsonResponse(
    {
      ok: false,
      error: 'File upload failed unexpectedly',
      requestId: fallbackRequestId,
      code: 'UnknownError',
    },
    500,
  )
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
