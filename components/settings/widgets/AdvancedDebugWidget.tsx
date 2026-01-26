"use client";

import { useEffect, useState } from "react";
import { useAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { SettingsSection } from "@/components/settings";
import { Skeleton } from "@/components/ai/ui/skeleton";

const debugSkeleton = (
  <div className="space-y-6">
    <SettingsSection
      title="Auth User"
      description="Raw user object."
    >
      <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
        <Skeleton className="h-32 w-full" />
      </div>
    </SettingsSection>

    <SettingsSection
      title="Access Token Claims"
      description="Decoded JWT claims."
    >
      <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
        <Skeleton className="h-32 w-full" />
      </div>
    </SettingsSection>
  </div>
);

export function AdvancedDebugWidget() {
  const { user, loading: userLoading } = useAuth();
  const { accessToken, loading: tokenLoading } = useAccessToken();
  const [debugUser, setDebugUser] = useState<string>("");
  const [debugClaims, setDebugClaims] = useState<string>("");

  useEffect(() => {
    if (user) {
      setDebugUser(JSON.stringify(user, null, 2));
    } else {
      setDebugUser("");
    }
  }, [user]);

  useEffect(() => {
    if (accessToken) {
      try {
        const [, payload] = accessToken.split(".");
        let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        const claims = JSON.parse(atob(base64));
        setDebugClaims(JSON.stringify(claims, null, 2));
      } catch {
        setDebugClaims("");
      }
    } else {
      setDebugClaims("");
    }
  }, [accessToken]);

  if (userLoading || tokenLoading) {
    return debugSkeleton;
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Auth User"
        description="Raw user object."
      >
        <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 dark:text-text-secondary whitespace-pre">
            {debugUser || "No user data available"}
          </pre>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Access Token Claims"
        description="Decoded JWT claims."
      >
        <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 dark:text-text-secondary whitespace-pre">
            {debugClaims || "No token claims available"}
          </pre>
        </div>
      </SettingsSection>
    </div>
  );
}
