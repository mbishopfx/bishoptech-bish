'use client';

import { useEffect, useState } from 'react';
import { Flex } from "@radix-ui/themes";
import { UsersManagement, WorkOsWidgets } from "@workos-inc/widgets";
import { SettingsSection } from "@/components/settings/SettingsSection";

interface MembersWidgetProps {
  authTokenPromise: Promise<string | null>;
}

export function MembersWidget({ authTokenPromise }: MembersWidgetProps) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authTokenPromise.then((token) => {
      setAuthToken(token);
      setLoading(false);
    });
  }, [authTokenPromise]);

  return (
    <SettingsSection
      title="Gestión de Miembros"
      description="Gestiona los miembros de la organización, roles y permisos con funciones avanzadas."
    >
      {loading || !authToken ? (
        <div>
          {/* Show nothing while loading or if no token */}
        </div>
      ) : (
        <Flex direction="column" gap="3" width="100%">
          <WorkOsWidgets
            theme={{
              appearance: "inherit",
              accentColor: "blue",
              radius: "medium",
              fontFamily: "Inter",
              panelBackground: "solid",
            }}
          >
            <UsersManagement authToken={authToken} />
          </WorkOsWidgets>
        </Flex>
      )}
    </SettingsSection>
  );
}
