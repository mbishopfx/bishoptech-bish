// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PERMISSIONS = {
  WIDGETS_USERS_TABLE_MANAGE: "widgets:users-table:manage",
  WIDGETS_DOMAIN_VERIFICATION_MANAGE: "widgets:domain-verification:manage",
  WIDGETS_SSO_MANAGE: "widgets:sso:manage",
  VIEW_ORG_ANALYTICS: "view-org-analytics",
  MANAGE_BILLING: "manage-billing",
  AUDIT_LOGS: "audit-logs",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// ============================================================================
// JWT PARSING
// ============================================================================

/*
 * Parses JWT access token to extract user permissions.
 * Returns an empty Set if token is invalid or permissions are missing.
 */
export function parsePermissionsFromAccessToken(accessToken?: string): Set<string> {
  if (!accessToken) return new Set();
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return new Set();
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as {
      permissions?: Array<string>;
    };
    return new Set(payload.permissions ?? []);
  } catch {
    return new Set();
  }
}

/*
 * Fetches the current user's permissions from the access token.
 */
export async function getPermissions(): Promise<Set<string>> {
  const { getAccessToken } = await import("./auth");
  const accessToken = await getAccessToken();
  return parsePermissionsFromAccessToken(accessToken);
}

// ============================================================================
// PERMISSION CHECKING UTILITIES
// ============================================================================

/**
 * Checks if a specific permission exists in a permission set.
 * This is the core permission checking function used by all other helpers.
 */
export function checkPermission(
  permissions: Set<string>,
  key: PermissionKey,
): boolean {
  return permissions.has(PERMISSIONS[key]);
}

/**
 * Checks if user has any of the specified permissions.
 * Returns true if at least one permission is granted.
 */
export function anyPermission(
  permissions: Set<string>,
  keys: Array<PermissionKey>,
): boolean {
  for (const key of keys) {
    if (permissions.has(PERMISSIONS[key])) return true;
  }
  return false;
}

// ============================================================================
// HIGH-LEVEL PERMISSION API
// ============================================================================

/**
 * Permission checker that handles authentication internally.
 * 
 * @example
 * ```
 * const canView = await hasPermission("VIEW_ORG_ANALYTICS");
 * if (!canView) return <Unauthorized />;
 * ```
 */
export async function hasPermission(permissionKey: PermissionKey): Promise<boolean> {
  const { withAuth } = await import("@workos-inc/authkit-nextjs");
  
  try {
    const { accessToken } = await withAuth({ ensureSignedIn: true });
    const permissions = parsePermissionsFromAccessToken(accessToken);
    return permissions.has(PERMISSIONS[permissionKey]);
  } catch {
    return false;
  }
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Request-scoped cache for permission sets to avoid duplicate JWT parsing.
 * For checking multiple permissions in the same request.
 */
let cachedPermissionSet: Promise<Set<string>> | null = null;

/**
 * Gets the current user's permission set with request-scoped caching.
 * Subsequent calls in the same request will return the cached result.
 */
export function getPermissionSet(): Promise<Set<string>> {
  if (!cachedPermissionSet) {
    cachedPermissionSet = getPermissions();
  }
  return cachedPermissionSet;
}

/**
 * Batched permission check for multiple permissions in a single call.
 * 
 * @example
 * ```
 * const perms = await hasPermissions([
 *   "WIDGETS_USERS_TABLE_MANAGE",
 *   "VIEW_ORG_ANALYTICS"
 * ]);
 * const canManage = perms.WIDGETS_USERS_TABLE_MANAGE;
 * const canView = perms.VIEW_ORG_ANALYTICS;
 * ```
 */
export async function hasPermissions(
  keys: Array<PermissionKey>,
): Promise<Record<PermissionKey, boolean>> {
  const set = await getPermissionSet();
  const result = {} as Record<PermissionKey, boolean>;
  
  for (const key of keys) {
    result[key] = checkPermission(set, key);
  }
  
  return result;
}

// ============================================================================
// TESTING & DEBUGGING UTILITIES
// ============================================================================

/**
 * Clears the in-memory permission cache.
 * Call this at the start of a request boundary if you need strict isolation between requests or tests.
 * 
 */
export function __resetPermissionCacheForTests() {
  cachedPermissionSet = null;
}


