'use client';

import { WorkOsWidgets, UserProfile } from "@workos-inc/widgets";

interface ProfileWidgetProps {
  accessToken: string | null;
}

export function ProfileWidget({ accessToken }: ProfileWidgetProps) {
  if (!accessToken) {
    return (
      <div className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No se pudo cargar el perfil
          </p>
          <p className="text-sm text-gray-500 dark:text-text-muted">
            Por favor, intenta recargar la página.
          </p>
        </div>
      </div>
    );
  }

  // Create the access token function in the client component
  const getAccessToken = () => Promise.resolve(accessToken);

  return (
    <WorkOsWidgets
      theme={{
        appearance: "inherit",
        accentColor: "blue",
        radius: "large",
        fontFamily: "Inter",
        panelBackground: "translucent",
      }}
    >
      <UserProfile authToken={getAccessToken} />
    </WorkOsWidgets>
  );
}
