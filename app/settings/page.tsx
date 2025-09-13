import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import SettingsPageContent from "./SettingsPageContent";

interface WorkOSUser {
  id?: string;
  email?: string;
  entitlements?: Array<string>;
  [key: string]: unknown;
}

export default async function SettingsPage() {
  const { user, accessToken } = await withAuth();
  let entitlements: Array<string> =
    ((user as unknown as WorkOSUser)?.entitlements as
      | Array<string>
      | undefined) ?? [];
  let claimsForDebug: unknown = null;
  let hasManageBillingPermission = false;

  if (entitlements.length === 0 && accessToken) {
    try {
      const [, payload] = accessToken.split(".");
      const claims = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8"),
      ) as { entitlements?: Array<string>; permissions?: Array<string> };
      claimsForDebug = claims;
      entitlements = claims.entitlements ?? [];
      hasManageBillingPermission =
        claims.permissions?.includes("manage-billing") ?? false;
    } catch {
      // ignore decode errors and fall back to empty entitlements
    }
  }

  const debugUser: string = JSON.stringify(user ?? {}, null, 2);
  const debugClaims: string = JSON.stringify(claimsForDebug ?? {}, null, 2);

  return (
    <ConvexClientProvider>
      <SettingsPageContent
        entitlements={entitlements}
        debugUser={debugUser}
        debugClaims={debugClaims}
        hasManageBillingPermission={hasManageBillingPermission}
      />
    </ConvexClientProvider>
  );
}
