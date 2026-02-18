'use client';

import { useEffect, useState } from 'react';
import { Flex } from "@radix-ui/themes";
import { AdminPortalDomainVerification, WorkOsWidgets } from "@workos-inc/widgets";

interface DomainSsoWidgetProps {
  authTokenPromise: Promise<string | null>;
}

export function DomainSsoWidget({ authTokenPromise }: DomainSsoWidgetProps) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authTokenPromise.then((token) => {
      setAuthToken(token);
      setLoading(false);
    });
  }, [authTokenPromise]);

  if (loading || !authToken) {
    return null; // Show nothing while loading or if no token
  }

  return (
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
        <AdminPortalDomainVerification authToken={authToken} />
      </WorkOsWidgets>
    </Flex>
  );
}
