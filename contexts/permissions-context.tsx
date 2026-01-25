"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth } from "convex/react";

// Client-side JWT parsing (browser-compatible)
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

interface PermissionsContextType {
  permissions: Set<string>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({
  children,
}: PermissionsProviderProps) {
  const { isAuthenticated } = useConvexAuth();
  const { accessToken } = useAccessToken();
  
  const permissions = useMemo(() => {
    if (!isAuthenticated || !accessToken) {
      return new Set<string>();
    }
    return parsePermissionsFromAccessToken(accessToken);
  }, [isAuthenticated, accessToken]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error(
      "usePermissionsContext must be used within a PermissionsProvider"
    );
  }
  return context;
}
