/**
 * Generate a UUID v4 (random UUID).
 * Uses crypto.randomUUID() when available,
 * falls back to Math.random() for older browsers.
 *
 * Security note: The fallback using Math.random() is NOT cryptographically secure
 * and should only be used when crypto.randomUUID() is unavailable.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
