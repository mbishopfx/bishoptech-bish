import crypto from "crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "rift_security_stepup";
const PENDING_COOKIE_NAME = "rift_security_stepup_pending";

type Payload = {
  uid: string;
  exp: number;
};

type PendingPayload = {
  uid: string;
  mid: string;
  exp: number;
};

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function getSigningSecret(): string {
  const secret =
    process.env.WORKOS_COOKIE_PASSWORD ??
    process.env.CONVEX_SECRET_TOKEN ??
    process.env.WORKOS_API_KEY;
  if (!secret) {
    throw new Error(
      "Missing signing secret: set WORKOS_COOKIE_PASSWORD or CONVEX_SECRET_TOKEN",
    );
  }
  return secret;
}

function sign(payloadB64: string): string {
  const secret = getSigningSecret();
  const mac = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return base64UrlEncode(mac);
}

export async function setStepUpCookie(
  userId: string,
  ttlMs: number = 5 * 60 * 1000,
) {
  const payload: Payload = { uid: userId, exp: Date.now() + ttlMs };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(payloadB64);
  const value = `${payloadB64}.${sig}`;

  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(ttlMs / 1000),
  });
}

export async function clearStepUpCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setPendingStepUpMagicAuthCookie(
  userId: string,
  magicAuthId: string,
  ttlMs: number = 10 * 60 * 1000,
) {
  const payload: PendingPayload = {
    uid: userId,
    mid: magicAuthId,
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(payloadB64);
  const value = `${payloadB64}.${sig}`;

  const store = await cookies();
  store.set(PENDING_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(ttlMs / 1000),
  });
}

export async function clearPendingStepUpMagicAuthCookie() {
  const store = await cookies();
  store.set(PENDING_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getPendingStepUpMagicAuthId(
  userId: string,
): Promise<string | null> {
  const store = await cookies();
  const value = store.get(PENDING_COOKIE_NAME)?.value;
  if (!value) return null;

  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = sign(payloadB64);
  const sigBuf = base64UrlDecode(sig);
  const expectedBuf = base64UrlDecode(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  let payload: PendingPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as PendingPayload;
  } catch {
    return null;
  }

  if (payload.uid !== userId) return null;
  if (Date.now() > payload.exp) return null;
  if (!payload.mid) return null;

  return payload.mid;
}

export async function assertStepUpVerified(userId: string): Promise<{
  ok: true;
} | {
  ok: false;
  error: string;
}> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return { ok: false, error: "step_up_required" };

  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return { ok: false, error: "step_up_required" };

  const expectedSig = sign(payloadB64);

  const sigBuf = base64UrlDecode(sig);
  const expectedBuf = base64UrlDecode(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { ok: false, error: "step_up_required" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as Payload;
  } catch {
    return { ok: false, error: "step_up_required" };
  }

  if (payload.uid !== userId) return { ok: false, error: "step_up_required" };
  if (Date.now() > payload.exp) return { ok: false, error: "step_up_required" };

  return { ok: true };
}

