import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import SettingsPageContent from "./SettingsPageContent";

interface WorkOSUser {
  id?: string;
  email?: string;
  [key: string]: unknown;
}

export default async function SettingsPage() {
  const { user, accessToken } = await withAuth();
  let claimsForDebug: unknown = null;
  let hasManageBillingPermission = false;

  if (accessToken) {
    try {
      const [, payload] = accessToken.split(".");
      const claims = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8"),
      ) as { permissions?: Array<string> };
      claimsForDebug = claims;
      hasManageBillingPermission =
        claims.permissions?.includes("manage-billing") ?? false;
    } catch {
      // ignore decode errors
    }
  }

  const debugUser: string = JSON.stringify(user ?? {}, null, 2);
  const debugClaims: string = JSON.stringify(claimsForDebug ?? {}, null, 2);

  return (
    <div className="min-h-screen bg-background dark:bg-popover-main">
      <ConvexClientProvider>
        <SettingsPageContent
          debugUser={debugUser}
          debugClaims={debugClaims}
          hasManageBillingPermission={hasManageBillingPermission}
        />
      </ConvexClientProvider>
    </div>
  );
}
