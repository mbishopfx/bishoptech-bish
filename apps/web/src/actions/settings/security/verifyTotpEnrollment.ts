"use server";

import { Effect } from "effect";

import {
  runSecurityAction,
  getAuthenticatedUserEffect,
  callWorkosApiEffect,
  workos,
} from "./security-effect";

type VerifyTotpEnrollmentArgs = {
  challengeId: string;
  code: string;
};

export async function verifyTotpEnrollment(
  args: VerifyTotpEnrollmentArgs,
): Promise<{ success: true } | { success: false; error: string }> {
  const code = (args.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: "Ingresa un código de 6 dígitos." };
  }

  return runSecurityAction({
    actionName: "verifyTotpEnrollment",
    fallbackMessage: "No se pudo verificar el código. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      // Ensure the caller is authenticated; MFA enrollment is tied to the signed-in user.
      const { user } = yield* getAuthenticatedUserEffect();

      const result = yield* callWorkosApiEffect("mfa.verifyChallenge", () =>
        workos.mfa.verifyChallenge({
          authenticationChallengeId: args.challengeId,
          code,
        }),
      );

      if (!result.valid) {
        return { success: false as const, error: "Código inválido. Intenta de nuevo." };
      }

      return { success: true as const };
    }),
  });
}

