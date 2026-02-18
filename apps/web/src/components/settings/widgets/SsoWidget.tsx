'use client';

import { useEffect, useState } from 'react';
import { Flex } from "@radix-ui/themes";
import { AdminPortalSsoConnection, WorkOsWidgets } from "@workos-inc/widgets";
import { SettingsSection } from "@/components/settings/SettingsSection";

interface SsoWidgetProps {
  authTokenPromise: Promise<string | null>;
}

export function SsoWidget({ authTokenPromise }: SsoWidgetProps) {
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
      title="Conexiones SSO"
      description="Configura las conexiones de Inicio de Sesión Único (SSO) para permitir la autenticación segura a través de proveedores de identidad."
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
            <AdminPortalSsoConnection authToken={authToken} />
          </WorkOsWidgets>
        </Flex>
      )}
    </SettingsSection>
  );
}
