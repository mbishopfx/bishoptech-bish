export type ConnectorAdapterErrorCode =
  | 'CONNECTOR_ENV_MISSING'
  | 'CONNECTOR_AUTH_MISSING'
  | 'CONNECTOR_AUTH_EXPIRED'
  | 'CONNECTOR_AUTH_REFRESH_FAILED'
  | 'CONNECTOR_API_UNAUTHORIZED'
  | 'CONNECTOR_API_FORBIDDEN'
  | 'CONNECTOR_API_RATE_LIMITED'
  | 'CONNECTOR_API_BAD_RESPONSE'

/**
 * Standard error contract for connector adapters.
 *
 * Workers can safely persist the `code` + `details` fields into `connector_failures`
 * and decide whether the connector should transition to `needs_auth`, retry later,
 * or stay in `connected` with an actionable error message.
 */
export class ConnectorAdapterError extends Error {
  readonly code: ConnectorAdapterErrorCode
  readonly details: Record<string, unknown>

  constructor(input: {
    readonly code: ConnectorAdapterErrorCode
    readonly message: string
    readonly details?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = 'ConnectorAdapterError'
    this.code = input.code
    this.details = input.details ?? {}
  }
}
