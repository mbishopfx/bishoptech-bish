import { v } from "convex/values";

// Minimal validator exported for convenience when defining args
export const serverSecretArg = { secret: v.string() } as const;

export function ensureServerSecret(secret: string): void {
  const expected = process.env.CONVEX_SECRET_TOKEN;
  if (!expected) {
    throw new Error("Server misconfiguration: CONVEX_SECRET_TOKEN is not set");
  }
  if (secret !== expected) {
    throw new Error("Unauthorized");
  }
}


