"use server";

import { Effect } from "effect";

import { runSecurityAction, getAuthenticatedUserEffect, callWorkosApiEffect, workos } from "./security-effect";

export type SecurityAuthFactor = {
  id: string;
  type: "totp";
  createdAt: string;
  updatedAt: string;
  totp: {
    issuer: string;
    user: string;
  };
};

export type SecuritySession = {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  authMethod: string;
  status: "active" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export async function getCurrentUserSecurityState(): Promise<
  | {
      success: true;
      factors: SecurityAuthFactor[];
      sessions: SecuritySession[];
      currentSessionId: string;
    }
  | { success: false; error: string }
> {
  return runSecurityAction({
    actionName: "getCurrentUserSecurityState",
    program: Effect.gen(function* () {
      const { user, sessionId } = yield* getAuthenticatedUserEffect();

      const { factorsResp, sessionsResp } = yield* Effect.all(
        {
          factorsResp: callWorkosApiEffect("userManagement.listAuthFactors", () =>
            workos.userManagement.listAuthFactors({ userId: user.id, limit: 50 }),
          ),
          sessionsResp: callWorkosApiEffect("userManagement.listSessions", () =>
            workos.userManagement.listSessions(user.id, { limit: 50 }),
          ),
        },
        { concurrency: 2 },
      );

      const factors: SecurityAuthFactor[] = factorsResp.data
        .filter((f) => f.type === "totp")
        .map((f) => ({
          id: f.id,
          type: "totp" as const,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          totp: {
            issuer: f.totp.issuer,
            user: f.totp.user,
          },
        }));

      const sessions: SecuritySession[] = sessionsResp.data.map((s) => ({
        id: s.id,
        userId: s.userId,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        authMethod: s.authMethod,
        status: s.status,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        endedAt: s.endedAt,
      }));

      return { success: true as const, factors, sessions, currentSessionId: sessionId };
    }),
  });
}

