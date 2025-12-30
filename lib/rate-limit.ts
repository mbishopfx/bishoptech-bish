import "server-only";

import { Data, Effect } from "effect";
import { kv } from "@vercel/kv";

// ============================================================================
// Types
// ============================================================================

export type RateLimitResult =
  | {
      readonly allowed: true;
    }
  | {
      readonly allowed: false;
      readonly retryAfter?: number;
      readonly reason: "rate_limit_exceeded" | "kv_error" | "kv_not_configured";
    };

export type RateLimitConfig = {
  readonly limit?: number;
  readonly windowSeconds?: number;
  readonly keyPrefix?: string;
};

// ============================================================================
// Errors
// ============================================================================

export class RateLimitConfigError extends Data.TaggedError("RateLimitConfigError")<{
  readonly message: string;
}> {}

export class RateLimitKvError extends Data.TaggedError("RateLimitKvError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type RateLimitError = RateLimitConfigError | RateLimitKvError;

// ============================================================================
// Helpers
// ============================================================================

const checkKvConfiguration = (): Effect.Effect<void, RateLimitConfigError> =>
  Effect.gen(function* () {
    const hasUrl = process.env.KV_REST_API_URL !== undefined;
    const hasToken = process.env.KV_REST_API_TOKEN !== undefined;

    if (!hasUrl || !hasToken) {
      return yield* Effect.fail(
        new RateLimitConfigError({
          message: "KV is not configured",
        })
      );
    }
  });

const calculateWindowKey = (
  userId: string,
  windowSeconds: number,
  keyPrefix: string,
): string => {
  const key = `${keyPrefix}${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  return `${key}:${windowStart}`;
};

const calculateRetryAfter = (
  now: number,
  windowStart: number,
  windowSeconds: number,
): number => {
  const retryAfter = windowSeconds - (now - windowStart);
  return Math.max(1, retryAfter);
};

// ============================================================================
// KV Operations
// ============================================================================

const getCurrentCount = (
  windowKey: string,
): Effect.Effect<number | null, RateLimitKvError> =>
  Effect.tryPromise({
    try: () => kv.get<number>(windowKey),
    catch: (cause) =>
      new RateLimitKvError({
        message: "Failed to get rate limit count from KV",
        cause,
      }),
  });

const setInitialCount = (
  windowKey: string,
  windowSeconds: number,
): Effect.Effect<void, RateLimitKvError> =>
  Effect.tryPromise({
    try: () => kv.set(windowKey, 1, { ex: windowSeconds }),
    catch: (cause) =>
      new RateLimitKvError({
        message: "Failed to set initial rate limit count in KV",
        cause,
      }),
  });

const incrementCount = (
  windowKey: string,
): Effect.Effect<number, RateLimitKvError> =>
  Effect.tryPromise({
    try: () => kv.incr(windowKey),
    catch: (cause) =>
      new RateLimitKvError({
        message: "Failed to increment rate limit count in KV",
        cause,
      }),
  });

const setExpiration = (
  windowKey: string,
  windowSeconds: number,
): Effect.Effect<void, RateLimitKvError> =>
  Effect.tryPromise({
    try: () => kv.expire(windowKey, windowSeconds),
    catch: (cause) =>
      new RateLimitKvError({
        message: "Failed to set expiration on rate limit key in KV",
        cause,
      }),
  });

// ============================================================================
// Error Message Helpers
// ============================================================================

export type RateLimitMessageConfig = {
  readonly rateLimitExceeded?: string;
  readonly kvError?: string;
  readonly kvNotConfigured?: string;
};

const defaultMessages: Required<RateLimitMessageConfig> = {
  rateLimitExceeded: "Has realizado demasiadas solicitudes. Por favor espera unos minutos antes de intentar de nuevo.",
  kvError: "Error del servidor al verificar el límite de solicitudes. Por favor intenta de nuevo en unos momentos.",
  kvNotConfigured: "El servicio está temporalmente no disponible. Por favor intenta de nuevo más tarde.",
};

/**
 * Formats retryAfter seconds into a human-readable time string.
 */
const formatRetryAfter = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
};

/**
 * Generates a user-friendly error message from a rate limit result.
 * 
 * @param result - The rate limit result
 * @param config - Optional custom error messages (use [retryafter] placeholder for time)
 * @returns Error message string, or undefined if rate limit is not exceeded
 */
export const getRateLimitErrorMessage = (
  result: RateLimitResult,
  config: RateLimitMessageConfig = {},
): string | undefined => {
  if (result.allowed) {
    return undefined;
  }

  const messages = { ...defaultMessages, ...config };
  let message: string;

  switch (result.reason) {
    case "rate_limit_exceeded":
      message = messages.rateLimitExceeded;
      break;
    case "kv_error":
      message = messages.kvError;
      break;
    case "kv_not_configured":
      message = messages.kvNotConfigured;
      break;
  }

  // Replace [retryafter] placeholder with formatted time if present
  if (result.retryAfter && message.includes("[retryafter]")) {
    const timeText = formatRetryAfter(result.retryAfter);
    message = message.replace("[retryafter]", timeText);
  }

  return message;
};

// ============================================================================
// Main Rate Limit Logic
// ============================================================================

/**
 * Fixed-window rate limiter using Vercel KV.
 * 
 * Note: This function never fails - all errors are caught internally
 * and result in `{ allowed: false }` for security (fail-closed behavior).
 * 
 * @param userId - The user ID to rate limit
 * @param config - Rate limit configuration (limit, windowSeconds, keyPrefix)
 * @returns Effect that always succeeds with a rate limit check result
 */
export const checkRateLimit = (
  userId: string,
  config: RateLimitConfig = {},
): Effect.Effect<RateLimitResult, never> => {
  // Capture config values for use in error handlers
  const windowSeconds = config.windowSeconds ?? 600;

  return Effect.gen(function* () {
    // Validate KV configuration
    yield* checkKvConfiguration();

    const limit = config.limit ?? 5;
    const keyPrefix = config.keyPrefix ?? "rate_limit:profile_update:";

    // Calculate window key
    const windowKey = calculateWindowKey(userId, windowSeconds, keyPrefix);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;

    // Get current count for this window
    const currentCount = yield* getCurrentCount(windowKey);

    if (currentCount === null) {
      // First request in this window, set count to 1 with expiration
      yield* setInitialCount(windowKey, windowSeconds);
      return { allowed: true as const };
    }

    if (currentCount >= limit) {
      // Rate limit exceeded
      const retryAfter = calculateRetryAfter(now, windowStart, windowSeconds);
      return {
        allowed: false as const,
        retryAfter,
        reason: "rate_limit_exceeded" as const,
      };
    }

    // Increment count
    yield* incrementCount(windowKey);

    // Ensure expiration is set
    yield* setExpiration(windowKey, windowSeconds);

    return { allowed: true as const };
  }).pipe(
    // If KV fails, fail closed
    Effect.catchTag("RateLimitKvError", (error) =>
      Effect.sync(() => {
        console.error("[rate-limit] Error checking rate limit:", error);
        return {
          allowed: false as const,
          retryAfter: windowSeconds,
          reason: "kv_error" as const,
        } satisfies RateLimitResult;
      })
    ),
    // If KV is not configured, fail closed
    Effect.catchTag("RateLimitConfigError", (error) =>
      Effect.sync(() => {
        console.warn("[rate-limit] KV is not configured, denying request");
        return {
          allowed: false as const,
          retryAfter: windowSeconds,
          reason: "kv_not_configured" as const,
        } satisfies RateLimitResult;
      })
    ),
  );
};

