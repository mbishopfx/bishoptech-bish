"use server";

import { Effect } from "effect";

import { setPendingStepUpMagicAuthCookie } from "@/lib/securityStepUp";
import { checkRateLimit, getRateLimitErrorMessage } from "@/lib/rate-limit";
import {
  getAuthenticatedUserEffect,
  runSecurityAction,
  SecurityConfigError,
  RateLimitError,
  workos,
  callWorkosApiEffect,
} from "./security-effect";

export async function sendSecurityEmailVerification(): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  return runSecurityAction({
    actionName: "sendSecurityEmailVerification",
    fallbackMessage: "No se pudo enviar el correo. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      const { user } = yield* getAuthenticatedUserEffect();

      // Rate limit email verification requests to prevent spam
      const rateLimitResult = yield* checkRateLimit(user.id, {
        limit: 6,
        windowSeconds: 600,
        keyPrefix: "rate_limit:security_verification:",
      });

      if (!rateLimitResult.allowed) {
        const errorMessage = getRateLimitErrorMessage(rateLimitResult, {
          rateLimitExceeded: "Has solicitado demasiados códigos de verificación. Por favor espera [retryafter] antes de intentar de nuevo.",
        });

        return yield* Effect.fail(
          new RateLimitError({
            message: errorMessage!,
            retryAfter: rateLimitResult.retryAfter,
          })
        );
      }

      // Use Magic Auth as a step-up challenge. This works even if the user's email is already verified.
      const magic = yield* callWorkosApiEffect("userManagement.createMagicAuth", () =>
        workos.userManagement.createMagicAuth({ email: user.email }),
      );

      yield* Effect.tryPromise({
        try: () => setPendingStepUpMagicAuthCookie(user.id, magic.id),
        catch: (cause) =>
          new SecurityConfigError({
            message: "No se pudo enviar el correo. Intenta de nuevo.",
            cause,
          }),
      });

      return { success: true as const };
    }),
  });
}

