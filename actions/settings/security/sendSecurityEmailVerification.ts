"use server";

import { Effect } from "effect";

import { setPendingStepUpMagicAuthCookie } from "@/lib/securityStepUp";
import {
  getAuthenticatedUserEffect,
  runSecurityAction,
  SecurityConfigError,
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

