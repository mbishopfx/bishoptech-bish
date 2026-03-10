import { Duration, Effect } from 'effect'

const DETACHED_TASK_TIMEOUT = Duration.seconds(30)
type DetachedTimeout = ReturnType<typeof Duration.seconds>

function withDetachedTimeout<TRequirements>(input: {
  readonly effect: Effect.Effect<void, never, TRequirements>
  readonly onTimeout?: Effect.Effect<void, never, TRequirements>
  readonly timeout?: DetachedTimeout
}) {
  return input.effect.pipe(
    Effect.timeout(input.timeout ?? DETACHED_TASK_TIMEOUT),
    Effect.catch(() => input.onTimeout ?? Effect.void),
  )
}

/**
 * Forks background work without failing the caller while preserving
 * observability through a typed error side-channel.
 */
export const runDetachedObserved = Effect.fn('server-effect.runDetachedObserved')(
  function* <TValue, TError, TRequirements>(input: {
    readonly effect: Effect.Effect<TValue, TError, TRequirements>
    readonly onFailure: (error: TError) => Effect.Effect<void, never, TRequirements>
    readonly onTimeout?: Effect.Effect<void, never, TRequirements>
    readonly timeout?: DetachedTimeout
  }): Effect.fn.Return<void, never, TRequirements> {
    yield* withDetachedTimeout({
      effect: input.effect.pipe(
        Effect.catch((error) => input.onFailure(error)),
        Effect.asVoid,
      ),
      onTimeout: input.onTimeout,
      timeout: input.timeout,
    }).pipe(Effect.forkDetach)
  },
)

/**
 * Runs detached work from imperative callbacks (for example, streaming hooks)
 * and forwards typed failures to an Effect-based error handler.
 */
export function runDetachedUnsafe<TValue, TError>(input: {
  readonly effect: Effect.Effect<TValue, TError>
  readonly onFailure: (error: TError) => Effect.Effect<void, never>
  readonly onTimeout?: Effect.Effect<void, never>
  readonly timeout?: DetachedTimeout
}): void {
  void Effect.runPromise(
    withDetachedTimeout({
      effect: input.effect.pipe(
        Effect.catch((error) => input.onFailure(error)),
        Effect.asVoid,
      ),
      onTimeout: input.onTimeout,
      timeout: input.timeout,
    }),
  ).catch(() => undefined)
}
