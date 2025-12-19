"use server";

import { Effect } from "effect";

import { clearStepUpCookie } from "@/lib/securityStepUp";

import {
  runSecurityAction,
  getAuthenticatedUserEffect,
  requireEmailVerificationStepUpEffect,
  callWorkosApiEffect,
  workos,
  SecurityConfigError,
} from "./security-effect";

export async function deleteAuthFactor(
  factorId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = (factorId ?? "").trim();
  if (!trimmed) return { success: false, error: "Factor no encontrado." };

  return runSecurityAction({
    actionName: "deleteAuthFactor",
    fallbackMessage: "No se pudo eliminar el factor. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      const { user } = yield* getAuthenticatedUserEffect();
      yield* requireEmailVerificationStepUpEffect(user.id);

      // Ownership check: ensure the auth factor belongs to the current user.
      const factorsResp = yield* callWorkosApiEffect("userManagement.listAuthFactors", () =>
        workos.userManagement.listAuthFactors({
          userId: user.id,
          limit: 100,
        }),
      );

      const userOwnsAuthFactor = factorsResp.data.some((f) => f.id === trimmed);
      if (!userOwnsAuthFactor) {
        return { success: false as const, error: "Factor no encontrado." };
      }

      yield* callWorkosApiEffect("mfa.deleteFactor", () => workos.mfa.deleteFactor(trimmed));

      yield* Effect.tryPromise({
        try: () => clearStepUpCookie(),
        catch: (cause) =>
          new SecurityConfigError({
            message: "No se pudo completar la operación. Intenta de nuevo.",
            cause,
          }),
      });

      return { success: true as const };
    }),
  });
}

