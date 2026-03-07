import { describe, expect, it } from 'vitest'
import { Duration, Effect } from 'effect'
import { runDetachedUnsafe } from './detached'

describe('runDetachedUnsafe', () => {
  it('runs the timeout handler for hanging detached work', async () => {
    let timedOut = false

    runDetachedUnsafe({
      effect: Effect.promise(() => new Promise<void>(() => {})),
      onFailure: () => Effect.void,
      onTimeout: Effect.sync(() => {
        timedOut = true
      }),
      timeout: Duration.millis(10),
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(timedOut).toBe(true)
  })

  it('routes failures through the typed failure handler', async () => {
    let failure: string | undefined
    let timedOut = false

    runDetachedUnsafe({
      effect: Effect.fail('boom'),
      onFailure: (error) =>
        Effect.sync(() => {
          failure = error
        }),
      onTimeout: Effect.sync(() => {
        timedOut = true
      }),
      timeout: Duration.millis(10),
    })

    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(failure).toBe('boom')
    expect(timedOut).toBe(false)
  })
})
