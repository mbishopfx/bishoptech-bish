"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Skeleton } from "@rift/ui/skeleton";
import { Switch } from "@rift/ui/switch";

const toggleSkeleton = (
  <div className="flex items-center">
    <Skeleton className="w-11 h-6 rounded-full" />
  </div>
);

export function MemoriaSettings() {
  const config = useQuery(api.userConfiguration.getUserConfiguration, {});
  const updatePreference = useMutation(api.userConfiguration.updateSupermemoryPreference)
    .withOptimisticUpdate((localStore, args) => {
      const { enabled } = args;
      const currentConfig = localStore.getQuery(api.userConfiguration.getUserConfiguration, {});
      if (currentConfig !== undefined && currentConfig !== null) {
        // Update the query result optimistically (preserve onboardingCompleted)
        localStore.setQuery(
          api.userConfiguration.getUserConfiguration,
          {},
          { ...currentConfig, supermemoryEnabled: enabled }
        );
      }
    });

  const handleToggle = useCallback((enabled: boolean) => {
    updatePreference({ enabled }).catch((err) => {
      console.error("Failed to update supermemory preference:", err);
    });
  }, [updatePreference]);

  if (config === undefined) {
    return toggleSkeleton;
  }

  if (config === null) {
    return (
      <div className="flex items-center">
        <p className="text-sm text-gray-500 dark:text-text-muted">
          No disponible
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Switch
        checked={config.supermemoryEnabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
