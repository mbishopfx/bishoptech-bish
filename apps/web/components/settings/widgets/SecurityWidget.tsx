'use client';

import { Flex } from "@radix-ui/themes";
import { WorkOsWidgets, UserSessions, UserSecurity } from "@workos-inc/widgets";

interface SecurityWidgetProps {
  accessToken: string | null;
  userId: string;
}

export function SecurityWidget({ accessToken, userId }: SecurityWidgetProps) {
  if (!accessToken) {
    return (
      <div className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No se pudo cargar la configuración de seguridad
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
      <Flex direction="column" gap="6" width="100%">
        <UserSecurity authToken={getAccessToken} />
        <div className="flex flex-col">
          <div className="flex flex-col mb-5">
            <div className="flex items-center">
              <p className="font-semibold text-base leading-6">
                Sesiones Activas
              </p>
            </div>
            <p className="text-gray-500 text-sm leading-5 mt-1">
              Gestiona tus preferencias de seguridad y configuración
              de autenticación.
            </p>
          </div>

          <UserSessions
            authToken={getAccessToken}
            currentSessionId={userId}
          />
        </div>
      </Flex>
    </WorkOsWidgets>
  );
}
