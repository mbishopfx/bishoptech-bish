"use server";

import { Effect } from "effect";

import { clearStepUpCookie } from "@/lib/securityStepUp";

import {
  getAuthenticatedUserEffect,
  requireEmailVerificationStepUpEffect,
  runSecurityAction,
  SecurityConfigError,
  workos,
  callWorkosApiEffect,
} from "./security-effect";

type SetCurrentUserPasswordArgs = {
  newPassword: string;
};

export async function setCurrentUserPassword(
  args: SetCurrentUserPasswordArgs,
): Promise<{ success: true } | { success: false; error: string }> {
  const newPassword = args.newPassword ?? "";
  if (newPassword.length < 12) {
    return {
      success: false,
      error: "La nueva contraseña debe tener al menos 12 caracteres.",
    };
  }

  return runSecurityAction({
    actionName: "setCurrentUserPassword",
    fallbackMessage: "No se pudo establecer la contraseña. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      const { user } = yield* getAuthenticatedUserEffect();
      yield* requireEmailVerificationStepUpEffect(user.id);

      yield* callWorkosApiEffect("userManagement.updateUser", () =>
        workos.userManagement.updateUser({
          userId: user.id,
          password: newPassword,
        }),
      );

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

