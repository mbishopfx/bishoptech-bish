"use client";

import {
  SettingsSection,
  StatusBadge,
  SettingRow,
  SettingsDivider,
} from "@/components/settings";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

interface SettingsPageContentProps {}

export default function SettingsPageContent({}: SettingsPageContentProps) {
  const orgInfo = useQuery(api.organizations.getCurrentOrganizationInfo);

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border bg-background dark:bg-popover-main">
      {/* Organization Name Section */}
      <SettingsSection
        title="Organization Name"
        description="The name of your organization visible to all members."
      >
        {orgInfo !== undefined ? (
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {orgInfo?.name || "Organization"}
          </div>
        ) : (
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-popover-secondary rounded w-48"></div>
          </div>
        )}
      </SettingsSection>


    </div>
  );
}
