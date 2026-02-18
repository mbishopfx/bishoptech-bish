"use client";

import { useMemo } from "react";
import { useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth } from "convex/react";
import { PERMISSIONS, type PermissionKey } from "./permissions";

/**
 * Parses JWT access token to extract user permissions.
 * Returns an empty Set if token is invalid or permissions are missing.
 */
function parsePermissionsFromAccessToken(accessToken: string | null): Set<string> {
  if (!accessToken) return new Set();
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return new Set();
    // Use atob for browser-compatible base64 decoding
    const payload = JSON.parse(atob(parts[1])) as {
      permissions?: Array<string>;
    };
    return new Set(payload.permissions ?? []);
  } catch {
    return new Set();
  }
}

/**
 * Hook to get the current user's permissions from the access token.
 * Returns a Set of permission strings.
 * 
 * @example
 * ```tsx
 * const permissions = usePermissions();
 * const canManage = permissions.has(PERMISSIONS.MANAGE_BILLING);
 * ```
 */
export function usePermissions(): Set<string> {
  const { isAuthenticated } = useConvexAuth();
  const { accessToken } = useAccessToken();
  // Only parse permissions if authenticated
  const token = isAuthenticated ? (accessToken ?? null) : null;
  return useMemo(() => parsePermissionsFromAccessToken(token), [token]);
}

/**
 * Hook to check if user has a specific permission.
 * 
 * @example
 * ```tsx
 * const canManageBilling = useHasPermission("MANAGE_BILLING");
 * if (!canManageBilling) return <Unauthorized />;
 * ```
 */
export function useHasPermission(permissionKey: PermissionKey): boolean {
  const permissions = usePermissions();
  return permissions.has(PERMISSIONS[permissionKey]);
}

/**
 * Hook to check multiple permissions at once.
 * Returns an object with boolean values for each permission key.
 * 
 * @example
 * ```tsx
 * const { MANAGE_BILLING, VIEW_ORG_ANALYTICS } = useHasPermissions([
 *   "MANAGE_BILLING",
 *   "VIEW_ORG_ANALYTICS"
 * ]);
 * ```
 */
export function useHasPermissions(
  keys: Array<PermissionKey>
): Record<PermissionKey, boolean> {
  const permissions = usePermissions();
  return useMemo(() => {
    const result = {} as Record<PermissionKey, boolean>;
    for (const key of keys) {
      result[key] = permissions.has(PERMISSIONS[key]);
    }
    return result;
  }, [permissions, keys.join(",")]);
}
