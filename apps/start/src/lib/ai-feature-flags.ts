/**
 * Temporary feature gates for chat capabilities.
 * These default to enabled and will be replaced with real org/user checks.
 */
export function canUseReasoningControls(): boolean {
  return true
}

export function canUseAdvancedProviderTools(): boolean {
  return true
}
