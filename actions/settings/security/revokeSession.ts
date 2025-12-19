"use server";

import { Effect } from "effect";

import { getAuthenticatedUserEffect, runSecurityAction, callWorkosApiEffect, workos } from "./security-effect";

export async function revokeSession(
  sessionId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = (sessionId ?? "").trim();
  if (!trimmed) return { success: false, error: "Sesión no encontrada." };

  return runSecurityAction({
    actionName: "revokeSession",
    fallbackMessage: "No se pudo cerrar la sesión. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      const { user, sessionId: currentSessionId } = yield* getAuthenticatedUserEffect();

      if (trimmed === currentSessionId) {
        return {
          success: false as const,
          error: "No puedes cerrar la sesión actual desde aquí.",
        };
      }

      // Ownership check: ensure session belongs to current user.
      const sessionsResp = yield* callWorkosApiEffect("userManagement.listSessions", () =>
        workos.userManagement.listSessions(user.id, { limit: 100 }),
      );

      const userOwnsSession = sessionsResp.data.some((s) => s.id === trimmed);
      if (!userOwnsSession) {
        return { success: false as const, error: "Sesión no encontrada." };
      }

      yield* callWorkosApiEffect("userManagement.revokeSession", () =>
        workos.userManagement.revokeSession({ sessionId: trimmed }),
      );

      return { success: true as const };
    }),
  });
}

