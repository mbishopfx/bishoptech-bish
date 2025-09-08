"use client";

import { OrganizationSwitcher, WorkOsWidgets } from "@workos-inc/widgets";
import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { useRouter } from "next/navigation";

export function OrganizationSwitcherClient() {
  const { switchToOrganization } = useAuth();
  const { accessToken } = useAccessToken();
  const router = useRouter();

  if (!accessToken) return null;
  const getAccessToken = async () => accessToken;

  const handleSwitch = async ({ organizationId }: { organizationId: string }) => {
    await switchToOrganization(organizationId);
    // Ensure server components and auth context re-fetch with new org
    window.location.reload();
  };

  return (
    <WorkOsWidgets>
      <OrganizationSwitcher
        authToken={getAccessToken}
        switchToOrganization={handleSwitch}
      />
      <style jsx global>{`
.OrganizationSwitcherTrigger {
    box-shadow: none;
    border-radius: var(--radius);
    color: var(--color-gray-900);
}
.OrganizationSwitcherTrigger:hover {
    background-color: var(--hover);
}
.OrganizationSwitcherTrigger:focus {
    background-color: var(--hover);
}
.OrganizationSwitcherTrigger:active {
    background-color: var(--hover);
}
      `}</style>
    </WorkOsWidgets>
  );
}


