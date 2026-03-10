"use client"

export {
  DirectionProvider,
  useDirection,
} from "@base-ui/react/direction-provider"

/**
 * Direction-aware class mapping used by consumers that need deterministic
 * layout behavior (e.g. sidebars, drawers, anchored overlays).
 */
export type DirectionClassMap = {
  ltr: string
  rtl: string
}

/**
 * Canonical direction type used across app shells and shared UI.
 */
export type TextDirection = "ltr" | "rtl"

/**
 * Language prefixes that should default to RTL page direction.
 * These are language-level checks so both `ar` and region variants like `ar-EG`
 * resolve consistently without maintaining a locale-by-locale list.
 */
const RTL_LANGUAGE_PREFIXES = [
  "ar",
  "fa",
  "he",
  "ur",
  "ps",
  "dv",
  "ku",
  "ug",
  "yi",
]

/**
 * Infers UI direction from a BCP-47 locale string.
 * Falls back to LTR for unknown or empty locales to keep rendering deterministic.
 */
export function getLocaleDirection(locale: string): TextDirection {
  const normalized = locale.trim().toLowerCase()
  if (!normalized) return "ltr"

  const language = normalized.split("-")[0] ?? normalized
  return RTL_LANGUAGE_PREFIXES.includes(language) ? "rtl" : "ltr"
}

/**
 * Returns the className fragment for the current text direction.
 * Centralizing this avoids ad-hoc ternaries scattered across app code.
 */
export function directionClass(
  direction: TextDirection,
  classes: DirectionClassMap,
): string {
  return direction === "rtl" ? classes.rtl : classes.ltr
}
