import { Effect, Layer, ServiceMap } from 'effect'
import { createResumableStreamContext } from 'resumable-stream'
import { createClient } from 'redis'
import { StreamProtocolError } from '../domain/errors'

type ActiveStreamRecord = {
  readonly streamId: string
  readonly requestId: string
  readonly startedAt: number
}

type LocalStreamHandle = {
  readonly abortController: AbortController
  readonly unsubscribe: () => Promise<void>
}

type ResumeRuntime = {
  readonly publisher: ReturnType<typeof createClient>
  readonly subscriber: ReturnType<typeof createClient>
  readonly streamContext: ReturnType<typeof createResumableStreamContext>
  readonly localHandles: Map<string, LocalStreamHandle>
  readonly localStreams: Map<string, LocalLiveStream>
}

type LocalLiveStream = {
  readonly chunks: string[]
  readonly listeners: Set<ReadableStreamDefaultController<string>>
  done: boolean
}

const ACTIVE_STREAM_TTL_SECONDS = 5 * 60
const STOP_CHANNEL_PREFIX = 'chat:stop:v1'
const ACTIVE_KEY_PREFIX = 'chat:active:v1'
const RESUMABLE_KEY_PREFIX = 'chat:resume:v1'
const RESUME_BATCH_MAX_CHARS = 16384
const RESUME_BATCH_MAX_DELAY_MS = 100

let runtimePromise: Promise<ResumeRuntime> | null = null

function getStopChannel(streamId: string): string {
  return `${STOP_CHANNEL_PREFIX}:${streamId}`
}

function getActiveKey(userId: string, threadId: string): string {
  return `${ACTIVE_KEY_PREFIX}:${userId}:${threadId}`
}

function parseActiveStreamRecord(value: string | null): ActiveStreamRecord | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<ActiveStreamRecord>
    if (
      typeof parsed.streamId === 'string' &&
      typeof parsed.requestId === 'string' &&
      typeof parsed.startedAt === 'number'
    ) {
      return {
        streamId: parsed.streamId,
        requestId: parsed.requestId,
        startedAt: parsed.startedAt,
      }
    }
    return null
  } catch {
    return null
  }
}

function batchSseStream(
  stream: ReadableStream<string>,
  options: {
    readonly maxChars: number
    readonly maxDelayMs: number
  },
): ReadableStream<string> {
  const { maxChars, maxDelayMs } = options

  return new ReadableStream<string>({
    start(controller) {
      const reader = stream.getReader()
      let buffer = ''
      let timer: ReturnType<typeof setTimeout> | undefined

      const flush = () => {
        if (!buffer) return
        controller.enqueue(buffer)
        buffer = ''
      }

      const scheduleFlush = () => {
        if (timer) return
        timer = setTimeout(() => {
          timer = undefined
          flush()
        }, maxDelayMs)
      }

      const clearTimer = () => {
        if (!timer) return
        clearTimeout(timer)
        timer = undefined
      }

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += value
            if (buffer.length >= maxChars) {
              clearTimer()
              flush()
              continue
            }
            scheduleFlush()
          }
          clearTimer()
          flush()
          controller.close()
        } catch (error) {
          clearTimer()
          controller.error(error)
        }
      }

      void pump()
    },
  })
}

async function getRuntime(): Promise<ResumeRuntime> {
  if (runtimePromise) return runtimePromise

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL is not configured')
  }

  runtimePromise = (async () => {
    const publisher = createClient({ url: redisUrl })
    const subscriber = createClient({ url: redisUrl })

    if (!publisher.isOpen) {
      await publisher.connect()
    }
    if (!subscriber.isOpen) {
      await subscriber.connect()
    }

    return {
      publisher,
      subscriber,
      streamContext: createResumableStreamContext({
        keyPrefix: RESUMABLE_KEY_PREFIX,
        waitUntil: null,
        publisher,
        subscriber,
      }),
      localHandles: new Map<string, LocalStreamHandle>(),
      localStreams: new Map<string, LocalLiveStream>(),
    }
  })()

  return runtimePromise
}

function createLocalResumeStream(local: LocalLiveStream): ReadableStream<string> {
  let registered:
    | ReadableStreamDefaultController<string>
    | null = null

  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of local.chunks) {
        controller.enqueue(chunk)
      }

      if (local.done) {
        controller.close()
        return
      }

      local.listeners.add(controller)
      registered = controller
    },
    cancel() {
      if (registered) {
        local.listeners.delete(registered)
        registered = null
      }
    },
  })
}

export type StreamResumeServiceShape = {
  readonly getActiveStreamId: (input: {
    readonly userId: string
    readonly threadId: string
    readonly requestId: string
  }) => Effect.Effect<string | null, StreamProtocolError>
  readonly registerActiveStream: (input: {
    readonly userId: string
    readonly threadId: string
    readonly requestId: string
    readonly streamId: string
    readonly abortController: AbortController
  }) => Effect.Effect<void, StreamProtocolError>
  readonly persistSseStream: (input: {
    readonly streamId: string
    readonly requestId: string
    readonly stream: ReadableStream<string>
  }) => Effect.Effect<void, StreamProtocolError>
  readonly resumeStream: (input: {
    readonly userId: string
    readonly threadId: string
    readonly requestId: string
  }) => Effect.Effect<ReadableStream<string> | null, StreamProtocolError>
  readonly stopStream: (input: {
    readonly streamId: string
    readonly requestId: string
  }) => Effect.Effect<void, StreamProtocolError>
  readonly clearActiveStream: (input: {
    readonly userId: string
    readonly threadId: string
    readonly requestId: string
    readonly expectedStreamId?: string
  }) => Effect.Effect<void, StreamProtocolError>
  readonly releaseLocalStream: (input: {
    readonly streamId: string
    readonly requestId: string
  }) => Effect.Effect<void, StreamProtocolError>
}

export class StreamResumeService extends ServiceMap.Service<
  StreamResumeService,
  StreamResumeServiceShape
>()('chat-backend/StreamResumeService') {}

export const StreamResumeLive = Layer.succeed(StreamResumeService, {
  getActiveStreamId: ({ userId, threadId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const record = parseActiveStreamRecord(
          await runtime.publisher.get(getActiveKey(userId, threadId)),
        )
        return record?.streamId ?? null
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to read active stream',
          requestId,
          cause: String(error),
        }),
    }),
  registerActiveStream: ({
    userId,
    threadId,
    requestId,
    streamId,
    abortController,
  }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const channel = getStopChannel(streamId)

        const unsubscribe = async () => {
          await runtime.subscriber.unsubscribe(channel)
        }

        await runtime.subscriber.subscribe(channel, () => {
          abortController.abort()
        })

        runtime.localHandles.set(streamId, {
          abortController,
          unsubscribe,
        })
        runtime.localStreams.set(streamId, {
          chunks: [],
          listeners: new Set(),
          done: false,
        })

        abortController.signal.addEventListener(
          'abort',
          () => {
            void unsubscribe()
            runtime.localHandles.delete(streamId)
          },
          { once: true },
        )

        await runtime.publisher.set(
          getActiveKey(userId, threadId),
          JSON.stringify({
            streamId,
            requestId,
            startedAt: Date.now(),
          } satisfies ActiveStreamRecord),
          { EX: ACTIVE_STREAM_TTL_SECONDS },
        )
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to register active stream',
          requestId,
          cause: String(error),
        }),
    }),
  persistSseStream: ({ streamId, requestId, stream }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const batchedStream = batchSseStream(stream, {
          maxChars: RESUME_BATCH_MAX_CHARS,
          maxDelayMs: RESUME_BATCH_MAX_DELAY_MS,
        })
        const [redisStream, localStream] = batchedStream.tee()

        const local = runtime.localStreams.get(streamId)
        if (local) {
          void (async () => {
            const localReader = localStream.getReader()
            try {
              while (true) {
                const { done, value } = await localReader.read()
                if (done) break
                local.chunks.push(value)
                for (const listener of Array.from(local.listeners)) {
                  try {
                    listener.enqueue(value)
                  } catch {
                    local.listeners.delete(listener)
                  }
                }
              }
            } finally {
              local.done = true
              for (const listener of Array.from(local.listeners)) {
                try {
                  listener.close()
                } catch {
                  // ignore
                }
              }
              local.listeners.clear()
            }
          })()
        }

        const resumableStream = await runtime.streamContext.createNewResumableStream(
          streamId,
          () => redisStream,
        )

        if (!resumableStream) return

        // Drain the internal stream so the resumable context never stalls on backpressure.
        const reader = resumableStream.getReader()
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to persist resumable stream',
          requestId,
          cause: String(error),
        }),
    }),
  resumeStream: ({ userId, threadId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const key = getActiveKey(userId, threadId)
        const record = parseActiveStreamRecord(await runtime.publisher.get(key))
        if (!record) return null

        const local = runtime.localStreams.get(record.streamId)
        if (local && !local.done) {
          return createLocalResumeStream(local)
        }

        const stream = await runtime.streamContext.resumeExistingStream(record.streamId)
        if (!stream) {
          await runtime.publisher.set(key, '', { EX: 1 })
          return null
        }

        return stream
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to resume active stream',
          requestId,
          cause: String(error),
        }),
    }),
  stopStream: ({ streamId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const local = runtime.localHandles.get(streamId)
        local?.abortController.abort()
        await runtime.publisher.publish(getStopChannel(streamId), 'stop')
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to stop active stream',
          requestId,
          cause: String(error),
        }),
    }),
  clearActiveStream: ({ userId, threadId, requestId, expectedStreamId }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const key = getActiveKey(userId, threadId)
        const current = parseActiveStreamRecord(await runtime.publisher.get(key))
        if (!current) return
        if (expectedStreamId && current.streamId !== expectedStreamId) return
        await runtime.publisher.set(key, '', { EX: 1 })
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to clear active stream',
          requestId,
          cause: String(error),
        }),
    }),
  releaseLocalStream: ({ streamId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await getRuntime()
        const handle = runtime.localHandles.get(streamId)
        if (!handle) return
        runtime.localHandles.delete(streamId)
        await handle.unsubscribe()
        runtime.localStreams.delete(streamId)
      },
      catch: (error) =>
        new StreamProtocolError({
          message: 'Failed to release local stream',
          requestId,
          cause: String(error),
        }),
    }),
})

// Test adapter for non-networked unit tests.
const memoryActiveStreams = new Map<string, string>()

function memoryKey(userId: string, threadId: string): string {
  return `${userId}:${threadId}`
}

export const StreamResumeMemory = Layer.succeed(StreamResumeService, {
  getActiveStreamId: ({ userId, threadId }) =>
    Effect.succeed(memoryActiveStreams.get(memoryKey(userId, threadId)) ?? null),
  registerActiveStream: ({ userId, threadId, streamId }) =>
    Effect.sync(() => {
      memoryActiveStreams.set(memoryKey(userId, threadId), streamId)
    }),
  persistSseStream: () => Effect.void,
  resumeStream: () => Effect.succeed(null),
  stopStream: () => Effect.void,
  clearActiveStream: ({ userId, threadId, expectedStreamId }) =>
    Effect.sync(() => {
      const key = memoryKey(userId, threadId)
      const current = memoryActiveStreams.get(key)
      if (!current) return
      if (expectedStreamId && current !== expectedStreamId) return
      memoryActiveStreams.delete(key)
    }),
  releaseLocalStream: () => Effect.void,
})
