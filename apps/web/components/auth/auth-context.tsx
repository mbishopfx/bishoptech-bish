"use client";

import { useMemo } from "react";
import { useAuth as useWorkOSAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";

/**
 * Auth context value structure matching WorkOS withAuth() return type.
 * This is the shape of data available throughout the app.
 */
export interface AuthContextValue {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    profilePictureUrl?: string | null;
    [key: string]: unknown;
  } | null;
  organizationId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  isLoading: boolean;
}

/**
 * Hook to access auth data from anywhere in the app.
 * Uses WorkOS client hooks directly - no server-side caching, always fresh.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, accessToken, isLoading } = useAuth();
 *   if (isLoading) return <Loading />;
 *   if (!user) return <LoginPrompt />;
 *   return <div>Hello {user.email}</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const { user, organizationId, sessionId, loading: userLoading } = useWorkOSAuth();
  const { accessToken, loading: tokenLoading } = useAccessToken();
  const isLoading = (userLoading ?? false) || (tokenLoading ?? false);

  return useMemo(
    () => ({
      user: user
        ? {
            id: user.id,
            email: user.email ?? "",
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            profilePictureUrl: user.profilePictureUrl ?? null,
          }
        : null,
      organizationId: organizationId ?? null,
      accessToken: accessToken ?? null,
      sessionId: sessionId ?? null,
      isLoading,
    }),
    [user, organizationId, accessToken, sessionId, isLoading]
  );
}

/**
 * Hook to access auth data, but returns null instead of throwing if not available.
 * Useful for optional auth checks.
 * 
 * Note: This always returns a value (never null) since WorkOS hooks are always available.
 * The user/organizationId may be null if not authenticated.
 */
export function useAuthOptional(): AuthContextValue {
  return useAuth();
}
