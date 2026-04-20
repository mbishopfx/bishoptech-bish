import { Schema } from 'effect'

// Branded IDs protect cross-service boundaries and keep logs consistent.
export const ThreadId = Schema.String.pipe(Schema.brand('@bish/ThreadId'))
export type ThreadId = Schema.Schema.Type<typeof ThreadId>

export const MessageId = Schema.String.pipe(Schema.brand('@bish/MessageId'))
export type MessageId = Schema.Schema.Type<typeof MessageId>

export const RequestId = Schema.String.pipe(Schema.brand('@bish/RequestId'))
export type RequestId = Schema.Schema.Type<typeof RequestId>

export const UserId = Schema.String.pipe(Schema.brand('@bish/UserId'))
export type UserId = Schema.Schema.Type<typeof UserId>
