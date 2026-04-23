import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'

/**
 * These runtime-resolution tests guard the production layer graph.
 * The chat runtime failed earlier because a newly introduced backend service
 * was not actually reachable from the assembled runtime, even though unit
 * tests using memory layers still passed.
 */
describe('ChatRuntime', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_DISABLE_REDIS', 'true')
  })

  it('resolves the message store from the production runtime graph', async () => {
    const { MessageStoreService } = await import(
      '@/lib/backend/chat/services/message-store.service'
    )
    const { ChatRuntime } = await import('./chat-runtime')

    const result = await ChatRuntime.run(
      Effect.gen(function* () {
        const messageStore = yield* MessageStoreService
        return typeof messageStore.loadThreadMessages
      }),
    )

    expect(result).toBe('function')
  })

  it('resolves the chat orchestrator from the production runtime graph', async () => {
    const { ChatOrchestratorService } = await import(
      '@/lib/backend/chat/services/chat-orchestrator.service'
    )
    const { ChatRuntime } = await import('./chat-runtime')

    const result = await ChatRuntime.run(
      Effect.gen(function* () {
        const orchestrator = yield* ChatOrchestratorService
        return typeof orchestrator.streamChat
      }),
    )

    expect(result).toBe('function')
  })
})
