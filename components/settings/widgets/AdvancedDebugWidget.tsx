"use client";

import { SettingsSection } from "@/components/settings";

interface AdvancedDebugWidgetProps {
  debugUser: string;
  debugClaims: string;
}

export function AdvancedDebugWidget({ debugUser, debugClaims }: AdvancedDebugWidgetProps) {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Auth User"
        description="Raw user object."
      >
        <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 dark:text-text-secondary whitespace-pre">
            {debugUser}
          </pre>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Access Token Claims"
        description="Decoded JWT claims."
      >
        <div className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-popover-secondary p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 dark:text-text-secondary whitespace-pre">
            {debugClaims}
          </pre>
        </div>
      </SettingsSection>
    </div>
  );
}
