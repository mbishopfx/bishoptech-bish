"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import {
  AuthKitProvider,
  useAuth,
  useAccessToken,
} from "@workos-inc/authkit-nextjs/components";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}
function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const {
    accessToken,
    loading: tokenLoading,
    error: tokenError,
  } = useAccessToken();
  const loading = (isLoading ?? false) || (tokenLoading ?? false);

  // Keep last known-good token to ride out transient refresh gaps
  const [stableAccessToken, setStableAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && !tokenError) {
      setStableAccessToken(accessToken);
    }
  }, [accessToken, tokenError]);

  // Consider authenticated if we have a user OR a stable token while loading
  const authenticated = !!user || (!!stableAccessToken && !tokenError);

  const fetchAccessToken = useCallback(async () => {
    if (stableAccessToken && !tokenError) {
      return stableAccessToken;
    }
    return null;
  }, [stableAccessToken, tokenError]);

  return {
    isLoading: loading,
    isAuthenticated: authenticated,
    fetchAccessToken,
  };
}
