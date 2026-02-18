import { withAuth } from "@workos-inc/authkit-nextjs";

/**
 * Server-side helper to get auth data.
 * Direct call to withAuth() - no caching to prevent stale auth status.
 * 
 * For client components, use useAuth() from @/components/auth/auth-context instead.
 * 
 * @example
 * ```ts
 * // In a server component
 * const { user, accessToken } = await getAuth();
 * if (!user) redirect("/sign-in");
 * ```
 */
export async function getAuth() {
  return withAuth({ ensureSignedIn: false });
}

/**
 * Server-side helper to get auth data with ensureSignedIn check.
 * Throws if user is not signed in.
 * 
 * @example
 * ```ts
 * // In a server component
 * const { user, accessToken } = await requireAuth();
 * // user is guaranteed to exist here
 * ```
 */
export async function requireAuth() {
  return withAuth({ ensureSignedIn: true });
}
