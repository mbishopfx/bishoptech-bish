import { withAuth as workosWithAuth } from "@workos-inc/authkit-nextjs";

// Re-export for convenience
export { workosWithAuth as withAuth };

/**
 * Gets the access token from WorkOS auth.
 * Returns undefined if not authenticated or on error.
 * 
 * @example
 * ```ts
 * const token = await getAccessToken();
 * if (!token) return <Unauthorized />;
 * ```
 */
export async function getAccessToken(): Promise<string | undefined> {
  try {
    const { accessToken } = await workosWithAuth({ ensureSignedIn: false });
    return accessToken;
  } catch {
    return undefined;
  }
}

