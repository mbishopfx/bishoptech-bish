"use server";

import { Effect, Either } from "effect";

import { getAuthenticatedUserEffect, runSecurityAction, callWorkosApiEffect, workos } from "./security-effect";

export async function revokeOtherSessions(): Promise<
  | { success: true; revoked: number }
  | { success: false; error: string }
> {
  return runSecurityAction({
    actionName: "revokeOtherSessions",
    fallbackMessage: "No se pudieron cerrar las otras sesiones. Intenta de nuevo.",
    hideWorkosDetails: true,
    program: Effect.gen(function* () {
      const { user, sessionId: currentSessionId } = yield* getAuthenticatedUserEffect();

      const sessionsResp = yield* callWorkosApiEffect("userManagement.listSessions", () =>
        workos.userManagement.listSessions(user.id, { limit: 100 }),
      );

      const sessionsToRevoke = sessionsResp.data.filter(
        (s) => s.status === "active" && s.id !== currentSessionId,
      );

      const results = yield* Effect.all(
        sessionsToRevoke.map((s) =>
          callWorkosApiEffect("userManagement.revokeSession", () =>
            workos.userManagement.revokeSession({ sessionId: s.id }),
          ).pipe(Effect.either),
        ),
        { concurrency: 5 },
      );

      const revoked = results.filter((r) => Either.isRight(r)).length;

      return { success: true as const, revoked };
    }),
  });
}

