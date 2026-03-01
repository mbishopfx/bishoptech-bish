import type { UIMessage } from 'ai'
import { Effect, Layer, ServiceMap } from 'effect'
import type { ChatDomainError } from '../domain/errors'
import { InvalidRequestError } from '../domain/errors'
import { chatErrorCodeFromTag } from '../domain/error-codes'
import { toReadableErrorMessage } from '../domain/error-formatting'
import type { IncomingUserMessage } from '../domain/schemas'
import type { IncomingAttachment } from '../domain/schemas'
import { getUserMessageText } from '../domain/schemas'
import { emitWideErrorEvent, getErrorTag } from '../observability/wide-event'
import { ChatErrorCode } from '@/lib/chat-contracts/error-codes'
import { canUseReasoningControls } from '@/utils/app-feature-flags'
import type { OrgAiPolicy } from '@/lib/model-policy/types'
import { MessageStoreService } from './message-store.service'
import { ModelGatewayService } from './model-gateway.service'
import { ModelPolicyService } from './model-policy.service'
import { RateLimitService } from './rate-limit.service'
import { StreamResumeService } from './stream-resume.service'
import { ThreadService } from './thread.service'
import { ToolRegistryService } from './tool-registry.service'

/**
 * High-level chat orchestration boundary.
 * Coordinates cross-cutting concerns (authz, throttling, model policy, persistence,
 * stream lifecycle) so route handlers stay thin.
 */
export type ChatOrchestratorServiceShape = {
  readonly createThread: (input: {
    readonly userId: string
    readonly requestId: string
  }) => Effect.Effect<{ readonly threadId: string }, ChatDomainError>

  readonly streamChat: (input: {
    readonly userId: string
    readonly threadId: string
    readonly orgWorkosId?: string
    readonly orgPolicy?: OrgAiPolicy
    readonly skipProviderKeyResolution?: boolean
    readonly requestId: string
    readonly trigger?: 'submit-message' | 'regenerate-message'
    readonly messageId?: string
    readonly expectedBranchVersion?: number
    readonly message?: IncomingUserMessage
    readonly attachments?: readonly IncomingAttachment[]
    readonly modelId?: string
    readonly reasoningEffort?: string
    readonly createIfMissing?: boolean
    readonly route: string
  }) => Effect.Effect<Response, ChatDomainError>
}

export class ChatOrchestratorService extends ServiceMap.Service<
  ChatOrchestratorService,
  ChatOrchestratorServiceShape
>()('chat-backend/ChatOrchestratorService') {}

/** Live orchestration implementation used by API routes. */
export const ChatOrchestratorLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* () {
    const threads = yield* ThreadService
    const messageStore = yield* MessageStoreService
    const rateLimit = yield* RateLimitService
    const modelGateway = yield* ModelGatewayService
    const modelPolicy = yield* ModelPolicyService
    const streamResume = yield* StreamResumeService
    const tools = yield* ToolRegistryService

    const createThread: ChatOrchestratorServiceShape['createThread'] = ({
      userId,
      requestId,
    }) =>
      threads
        .createThread({ userId, requestId })
        .pipe(Effect.map((created) => ({ threadId: created.threadId })))

    const streamChat: ChatOrchestratorServiceShape['streamChat'] = ({
      userId,
      threadId,
      orgWorkosId,
      orgPolicy,
      skipProviderKeyResolution,
      requestId,
      trigger,
      messageId,
      expectedBranchVersion,
      message,
      attachments,
      modelId,
      reasoningEffort,
      createIfMissing,
      route,
    }) => {
      const startedAt = Date.now()
      let currentStreamId: string | undefined
      const requestTrigger = trigger ?? 'submit-message'
      return Effect.gen(function* () {
        if (typeof expectedBranchVersion !== 'number') {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: 'Missing expectedBranchVersion',
              requestId,
              issue: 'expectedBranchVersion is required',
            }),
          )
        }
        if (requestTrigger === 'submit-message' && !message) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: 'Missing user message',
              requestId,
              issue: 'message is required for submit-message',
            }),
          )
        }
        if (
          requestTrigger === 'regenerate-message' &&
          (!messageId || messageId.trim().length === 0)
        ) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: 'Missing regenerate target message',
              requestId,
              issue: 'messageId is required for regenerate-message',
            }),
          )
        }

        yield* rateLimit.assertAllowed({ userId, requestId })

        const threadAccess = yield* threads.assertThreadAccess({
          userId,
          threadId,
          requestId,
          createIfMissing,
        })

        // Fire-and-forget title generation after the first message bootstrap path.
        if (createIfMissing && message) {
          const userMessage = getUserMessageText(message)
          if (userMessage) {
            void Effect.runPromise(
              threads
                .autoGenerateTitle({
                  userId,
                  threadId,
                  userMessage,
                  requestId,
                })
                .pipe(
                  Effect.catch((titleError) =>
                    emitWideErrorEvent({
                      eventName: 'chat.thread.title.generation.failed',
                      route,
                      requestId,
                      userId,
                      threadId,
                      model: threadAccess.model,
                      errorCode: chatErrorCodeFromTag(titleError._tag),
                      errorTag: titleError._tag,
                      message: titleError.message,
                    }),
                  ),
                ),
            )
          }
        }

        // Model is resolved once per request and reused for tool selection,
        // persistence, stream runtime, and observability metadata.
        const modelResolution = yield* modelPolicy.resolveThreadModel({
          threadId,
          orgWorkosId,
          orgPolicy,
          threadModel: threadAccess.model,
          threadReasoningEffort: threadAccess.reasoningEffort,
          requestedModelId: modelId,
          requestedReasoningEffort: canUseReasoningControls()
            ? reasoningEffort
            : undefined,
          skipProviderKeyResolution,
          requestId,
        })
        const toolRegistry = yield* tools.resolveForThread({
          threadId,
          userId,
          requestId,
          modelId: modelResolution.modelId,
        })

        // Enforce one active stream per user/thread to avoid interleaved assistant writes.
        const existingStreamId = yield* streamResume.getActiveStreamId({
          userId,
          threadId,
          requestId,
        })
        if (existingStreamId) {
          yield* streamResume.stopStream({
            streamId: existingStreamId,
            requestId,
          })
          yield* streamResume.clearActiveStream({
            userId,
            threadId,
            requestId,
            expectedStreamId: existingStreamId,
          })
        }

        const streamId = crypto.randomUUID()
        currentStreamId = streamId
        const streamAbortController = new AbortController()
        yield* streamResume.registerActiveStream({
          userId,
          threadId,
          requestId,
          streamId,
          abortController: streamAbortController,
        })

        if (
          requestTrigger === 'regenerate-message' &&
          (threadAccess.generationStatus === 'pending' ||
            threadAccess.generationStatus === 'generation')
        ) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: 'Cannot regenerate while stream is active',
              requestId,
              issue: 'thread is currently generating',
            }),
          )
        }

        let assistantParentMessageId: string | undefined
        let regenSourceMessageId: string | undefined
        let messages: UIMessage[]

        if (requestTrigger === 'regenerate-message') {
          const regeneration = yield* messageStore.prepareRegeneration({
            threadDbId: threadAccess.dbId,
            threadId,
            userId,
            targetMessageId: messageId!,
            expectedBranchVersion,
            requestId,
          })
          assistantParentMessageId = regeneration.anchorMessageId
          regenSourceMessageId = regeneration.regenSourceMessageId

          messages = yield* messageStore.loadThreadMessages({
            threadId,
            model: modelResolution.modelId,
            untilMessageId: regeneration.anchorMessageId,
            requestId,
          })
        } else {
          yield* messageStore.appendUserMessage({
            threadDbId: threadAccess.dbId,
            threadId,
            message: message!,
            attachments,
            userId,
            model: modelResolution.modelId,
            reasoningEffort: modelResolution.reasoningEffort,
            modelParams: {
              reasoningEffort: modelResolution.reasoningEffort,
            },
            expectedBranchVersion,
            requestId,
          })

          messages = yield* messageStore.loadThreadMessages({
            threadId,
            model: modelResolution.modelId,
            requestId,
          })
          assistantParentMessageId = message!.id
        }

        // This ID is generated server-side so start/finalize writes are deterministic
        // and idempotent even when transport retries happen.
        const assistantMessageId = crypto.randomUUID()
        let assistantFinalized = false
        let streamCleanedUp = false
        let bufferedAssistantText = ''
        let bufferedAssistantReasoning = ''
        let transportErrorHandled = false
        const defaultStreamFailureMessage =
          'The assistant response failed while streaming. Please retry.'

        const cleanupActiveStream = () => {
          if (streamCleanedUp) return
          streamCleanedUp = true

          void Effect.runPromise(
            Effect.gen(function* () {
              yield* streamResume.clearActiveStream({
                userId,
                threadId,
                requestId,
                expectedStreamId: streamId,
              })
              yield* streamResume.releaseLocalStream({
                streamId,
                requestId,
              })
            }).pipe(
              Effect.catch((error) =>
                emitWideErrorEvent({
                  eventName: 'chat.stream.cleanup.failed',
                  route,
                  requestId,
                  userId,
                  threadId,
                  model: modelResolution.modelId,
                  errorCode: chatErrorCodeFromTag(error._tag),
                  errorTag: error._tag,
                  message: error.message,
                  latencyMs: Date.now() - startedAt,
                }),
              ),
            ),
          )
        }

        const finalizeAssistant = (input: {
          ok: boolean
          errorMessage?: string
        }) => {
          if (assistantFinalized) return
          assistantFinalized = true

          void Effect.runPromise(
            messageStore
              .finalizeAssistantMessage({
                threadDbId: threadAccess.dbId,
                threadModel: modelResolution.modelId,
                threadId,
                userId,
                assistantMessageId,
                parentMessageId: assistantParentMessageId,
                branchAnchorMessageId: assistantParentMessageId,
                regenSourceMessageId,
                ok: input.ok,
                finalContent: bufferedAssistantText,
                reasoning:
                  bufferedAssistantReasoning.trim().length > 0
                    ? bufferedAssistantReasoning
                    : undefined,
                errorMessage: input.errorMessage,
                modelParams: {
                  reasoningEffort: modelResolution.reasoningEffort,
                },
                requestId,
              })
              .pipe(
                Effect.catch((error) =>
                  emitWideErrorEvent({
                    eventName: 'chat.stream.persist.failed',
                    route,
                    requestId,
                    userId,
                    threadId,
                    model: modelResolution.modelId,
                    errorCode: chatErrorCodeFromTag(error._tag),
                    errorTag: error._tag,
                    message: error.message,
                    latencyMs: Date.now() - startedAt,
                    cause: input.ok
                      ? 'assistant_finalize_success'
                      : 'assistant_finalize_error',
                  }),
                ),
              ),
          )
        }

        const result = yield* modelGateway.streamResponse({
          messages,
          model: modelResolution.modelId,
          providerApiKeyOverride: modelResolution.providerApiKeyOverride,
          requestId,
          tools: toolRegistry.tools,
          activeTools: toolRegistry.activeTools,
          providerOptions: modelResolution.reasoningEffort
            ? toolRegistry.providerOptionsByReasoning[
                modelResolution.reasoningEffort
              ]
            : toolRegistry.defaultProviderOptions,
          reasoningEffort: modelResolution.reasoningEffort,
          abortSignal: streamAbortController.signal,
          onChunk: (chunk: unknown) => {
            if (!chunk || typeof chunk !== 'object') return
            const candidate = chunk as { type?: unknown; text?: unknown }
            // Persisted assistant content is reconstructed from deltas as they arrive.
            if (
              candidate.type === 'text-delta' &&
              typeof candidate.text === 'string'
            ) {
              bufferedAssistantText += candidate.text
              return
            }
            // Reasoning deltas are streamed independently from text deltas by AI SDK.
            if (
              candidate.type === 'reasoning-delta' &&
              typeof candidate.text === 'string'
            ) {
              bufferedAssistantReasoning += candidate.text
            }
          },
        })

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: {
            'Content-Encoding': 'none',
            'Cache-Control': 'no-cache, no-transform',
          },
          consumeSseStream: ({ stream }) => {
            void Effect.runPromise(
              streamResume
                .persistSseStream({
                  streamId,
                  requestId,
                  stream,
                })
                .pipe(
                  Effect.catch((error) =>
                    emitWideErrorEvent({
                      eventName: 'chat.stream.resume.persist.failed',
                      route,
                      requestId,
                      userId,
                      threadId,
                      model: modelResolution.modelId,
                      errorCode: chatErrorCodeFromTag(error._tag),
                      errorTag: error._tag,
                      message: error.message,
                      latencyMs: Date.now() - startedAt,
                    }),
                  ),
                ),
            )
          },
          onError: (error: unknown) => {
            // The AI SDK can invoke stream error hooks more than once for the same
            // transport failure. We only persist/log once per request.
            if (transportErrorHandled) {
              return defaultStreamFailureMessage
            }
            transportErrorHandled = true

            const readableMessage = toReadableErrorMessage(
              error,
              defaultStreamFailureMessage,
            )
            finalizeAssistant({
              ok: false,
              errorMessage: readableMessage,
            })
            cleanupActiveStream()

            // Fire-and-forget observability; do not block the stream response.
            void Effect.runPromise(
              emitWideErrorEvent({
                eventName: 'chat.stream.transport.failed',
                route,
                requestId,
                userId,
                threadId,
                model: modelResolution.modelId,
                errorCode: chatErrorCodeFromTag(getErrorTag(error)),
                errorTag: getErrorTag(error),
                message: readableMessage,
                latencyMs: Date.now() - startedAt,
                retryable: true,
              }),
            )

            return readableMessage
          },
          messageMetadata: ({ part }: { part: any }) => {
            // Metadata is attached only for lifecycle events consumed by the client.
            if (part.type === 'start') {
              return {
                threadId,
                requestId,
                model: modelResolution.modelId,
                modelSource: modelResolution.source,
                startedAt,
              }
            }
            if (part.type === 'finish') {
              return {
                threadId,
                requestId,
                model: modelResolution.modelId,
                modelSource: modelResolution.source,
                completedAt: Date.now(),
                totalTokens: part.totalUsage.totalTokens,
              }
            }
            return undefined
          },
          onFinish: ({
            isAborted,
            responseMessage,
          }: {
            isAborted: boolean
            responseMessage: UIMessage
          }) => {
            // If we missed some content in chunk callbacks, use the response payload as fallback.
            if (!bufferedAssistantText) {
              bufferedAssistantText = responseMessage.parts
                .filter(
                  (
                    part,
                  ): part is Extract<
                    typeof part,
                    { type: 'text'; text: string }
                  > =>
                    part.type === 'text' &&
                    typeof (part as { text?: unknown }).text === 'string',
                )
                .map((part) => part.text)
                .join('')
            }

            // Fallback to finalized response payload if chunk-level reasoning events were missed.
            if (!bufferedAssistantReasoning) {
              bufferedAssistantReasoning = responseMessage.parts
                .filter(
                  (
                    part,
                  ): part is Extract<
                    typeof part,
                    { type: 'reasoning'; text: string }
                  > =>
                    part.type === 'reasoning' &&
                    typeof (part as { text?: unknown }).text === 'string',
                )
                .map((part) => part.text)
                .join('\n\n')
            }

            const ok = bufferedAssistantText.length > 0
            finalizeAssistant({
              ok,
              // Explicit failure reasons improve support/debugging and future analytics.
              errorMessage: isAborted
                ? 'Stream aborted before completion'
                : ok
                  ? undefined
                  : 'No assistant content generated',
            })
            cleanupActiveStream()
          },
        })
      }).pipe(
        Effect.tapError((error) =>
          Effect.gen(function* () {
            const errorTag = getErrorTag(error)
            if (errorTag === 'BranchVersionConflictError') {
              const conflict =
                typeof error === 'object' && error !== null
                  ? (error as {
                      expectedBranchVersion?: number
                      actualBranchVersion?: number
                    })
                  : {}
              const expected =
                typeof conflict.expectedBranchVersion === 'number'
                  ? conflict.expectedBranchVersion
                  : undefined
              const actual =
                typeof conflict.actualBranchVersion === 'number'
                  ? conflict.actualBranchVersion
                  : undefined
              const conflictCause =
                typeof expected === 'number' && typeof actual === 'number'
                  ? `expected=${expected},actual=${actual},trigger=${requestTrigger}`
                  : `trigger=${requestTrigger}`

              yield* Effect.annotateLogs(
                Effect.logWarning('chat_branch_version_conflict'),
                {
                  route,
                  request_id: requestId,
                  user_id: userId,
                  thread_id: threadId,
                  trigger: requestTrigger,
                  expected_branch_version: expected,
                  actual_branch_version: actual,
                },
              )
              yield* emitWideErrorEvent({
                eventName: 'chat.branch.version.conflict',
                route,
                requestId,
                userId,
                threadId,
                model: modelId,
                errorCode: ChatErrorCode.BranchVersionConflict,
                errorTag,
                message: error.message,
                latencyMs: Date.now() - startedAt,
                retryable: true,
                cause: conflictCause,
              })
            }
            // Ensures threads do not stay in "pending/generation" after early
            // failures (e.g. model policy denied before stream initialization).
            yield* threads
              .markThreadGenerationFailed({
                userId,
                threadId,
                requestId,
              })
              .pipe(Effect.catch(() => Effect.void))

            if (!currentStreamId) {
              return yield* emitWideErrorEvent({
                eventName: 'chat.stream.request.failed',
                route,
                requestId,
                userId,
                threadId,
                errorCode: chatErrorCodeFromTag(errorTag),
                errorTag,
                message: error.message,
                latencyMs: Date.now() - startedAt,
                retryable: true,
              })
            }
            const failedStreamId = currentStreamId

            yield* emitWideErrorEvent({
              eventName: 'chat.stream.request.failed',
              route,
              requestId,
              userId,
              threadId,
              errorCode: chatErrorCodeFromTag(errorTag),
              errorTag,
              message: error.message,
              latencyMs: Date.now() - startedAt,
              retryable: true,
            })
            yield* streamResume.clearActiveStream({
              userId,
              threadId,
              requestId,
              expectedStreamId: failedStreamId,
            })
            yield* streamResume.releaseLocalStream({
              streamId: failedStreamId,
              requestId,
            })
          }),
        ),
        Effect.catch((error) => Effect.fail(error)),
      )
    }

    return {
      createThread,
      streamChat,
    }
  }),
)
