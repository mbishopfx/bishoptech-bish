import {
  SettingsSection,
  StatusBadge,
  SettingRow,
  OrganizationIcon,
  SettingsInput,
  SettingsDivider,
} from "@/components/settings";
import { withAuth } from "@workos-inc/authkit-nextjs";

export default async function SettingsPage() {
  const { user, accessToken } = await withAuth();
  let entitlements: Array<string> =
    ((user as any)?.entitlements as Array<string> | undefined) ?? [];
  let claimsForDebug: unknown = null;
  if (entitlements.length === 0 && accessToken) {
    try {
      const [, payload] = accessToken.split(".");
      const claims = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8"),
      ) as { entitlements?: Array<string> };
      claimsForDebug = claims;
      entitlements = claims.entitlements ?? [];
    } catch {
      // ignore decode errors and fall back to empty entitlements
    }
  }
  const debugUser: string = JSON.stringify(user ?? {}, null, 2);
  const debugClaims: string = JSON.stringify(claimsForDebug ?? {}, null, 2);

  // TODO: Implement subscription data retrieval
  const planName = null;
  const billing = null;
  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* Header */}
      <h3 className="font-semibold text-xl leading-7 flex items-center mb-5">
        <button className="font-semibold text-left transition-transform duration-150 text-gray-500 hover:text-gray-700">
          Arisay's Workspace<span className="px-1">/</span>
        </button>
        Overview
      </h3>

      {/* Organization Icon Section */}
      <SettingsSection
        title="Organization Icon"
        description="Organization branding visible to all members."
      >
        <OrganizationIcon name="Arisay's Workspace" />
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Name Section */}
      <SettingsSection
        title="Organization Name"
        description="The name of your organization visible to all members."
      >
        <SettingsInput defaultValue="Arisay's Workspace" maxLength={50} />
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Policy Section */}
      <SettingsSection
        title="Organization Policy"
        description="Applies to all members authenticating to this organization."
      >
        <div className="space-y-4">
          <SettingRow label="Single Sign-On (SSO) for domain members">
            <StatusBadge status="not-required">Not required</StatusBadge>
          </SettingRow>

          <SettingRow label="Single Sign-On (SSO) for guest members">
            <StatusBadge status="not-required">Not required</StatusBadge>
          </SettingRow>

          <SettingRow label="Multi-Factor Authentication">
            <StatusBadge status="not-required">Not required</StatusBadge>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Directory Sync Section */}
      <SettingsSection
        title="Directory Sync"
        description="Manage user provisioning and synchronization settings."
      >
        <div className="space-y-4">
          <SettingRow label="Directory Sync">
            <StatusBadge status="enabled">Enable</StatusBadge>
          </SettingRow>

          <SettingRow label="Just-in-time provisioning">
            <StatusBadge status="disabled">Disable</StatusBadge>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Stats Section */}
      <SettingsSection
        title="Organization Statistics"
        description="Current organization usage and member count."
      >
        <div className="space-y-4">
          <SettingRow label="Total Users">
            <span className="text-sm font-semibold text-gray-900">1,247</span>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Entitlements (WorkOS) */}
      <SettingsSection
        title="Entitlements"
        description="Feature flags granted to the signed-in user via WorkOS."
      >
        {entitlements.length > 0 ? (
          <div className="space-y-2">
            {entitlements.map((entitlement, idx) => (
              <SettingRow key={`${entitlement}-${idx}`} label={entitlement}>
                <StatusBadge status="enabled">Granted</StatusBadge>
              </SettingRow>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <SettingRow label="No entitlements found">
              <StatusBadge status="disabled">None</StatusBadge>
            </SettingRow>
          </div>
        )}
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Plan (Stripe) */}
      <SettingsSection
        title="Organization Plan"
        description="Current Stripe plan linked to this WorkOS organization."
      >
        <div className="space-y-2">
          <SettingRow label="Plan">
            <span className="text-sm font-semibold text-gray-900">
              {planName ?? "None found"}
            </span>
          </SettingRow>
          <SettingRow label="Billing period">
            <span className="text-sm text-gray-900">
              {billing
                ? `${new Date(billing.currentPeriodStart * 1000).toLocaleDateString()} – ${new Date(billing.currentPeriodEnd * 1000).toLocaleDateString()}`
                : "—"}
            </span>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Debug: Auth User */}
      <SettingsSection
        title="Debug: Auth User"
        description="Raw WorkOS user object for debugging."
      >
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 whitespace-pre">
            {debugUser}
          </pre>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Debug: Access Token Claims */}
      <SettingsSection
        title="Debug: Access Token Claims"
        description="Decoded JWT claims (source of entitlements when not on user)."
      >
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 overflow-x-auto">
          <pre className="text-xs leading-5 text-gray-800 whitespace-pre">
            {debugClaims}
          </pre>
        </div>
      </SettingsSection>
    </div>
  );
}
