"use client";

import {
  SettingsSection,
  StatusBadge,
  SettingRow,
  SettingsDivider,
} from "@/components/settings";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

interface SettingsPageContentProps {
  entitlements: Array<string>;
  debugUser: string;
  debugClaims: string;
  hasManageBillingPermission: boolean;
}

export default function SettingsPageContent({
  entitlements,
  debugUser,
  debugClaims,
  hasManageBillingPermission,
}: SettingsPageContentProps) {
  const orgInfo = useQuery(api.organizations.getCurrentOrganizationInfo);
  const billingInfo = useQuery(
    api.organizations.getOrganizationBillingInfo,
    hasManageBillingPermission ? {} : "skip",
  );
  const userCount = useQuery(api.organizations.getOrganizationUserCount);

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* Organization Name Section */}
      <SettingsSection
        title="Organization Name"
        description="The name of your organization visible to all members."
      >
        {orgInfo !== undefined ? (
          <div className="text-sm font-semibold text-gray-900">
            {orgInfo?.name || "Organization"}
          </div>
        ) : (
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48"></div>
          </div>
        )}
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Statistics Section */}
      <SettingsSection
        title="Organization Statistics"
        description="Current organization usage and member count."
      >
        <div className="space-y-4">
          <SettingRow label="Total Users">
            {userCount !== undefined ? (
              <span className="text-sm font-semibold text-gray-900">
                {userCount?.totalUsers || 0}
              </span>
            ) : (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            )}
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Organization Plan (Stripe) - Only show if user has manage-billing permission */}
      {hasManageBillingPermission && (
        <>
          <SettingsSection
            title="Organization Plan"
            description="Current Stripe plan linked to this WorkOS organization."
          >
            <div className="space-y-2">
              <SettingRow label="Plan">
                {billingInfo === undefined ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : billingInfo?.plan ? (
                  <span className="text-sm font-semibold text-gray-900">
                    {billingInfo.plan.charAt(0).toUpperCase() +
                      billingInfo.plan.slice(1)}
                  </span>
                ) : null}
              </SettingRow>
              <SettingRow label="Status">
                {billingInfo === undefined ? (
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                ) : billingInfo?.subscriptionStatus ? (
                  <StatusBadge
                    status={
                      billingInfo.subscriptionStatus === "active"
                        ? "enabled"
                        : "disabled"
                    }
                  >
                    {billingInfo.subscriptionStatus === "active"
                      ? "Active"
                      : billingInfo.subscriptionStatus.charAt(0).toUpperCase() +
                        billingInfo.subscriptionStatus.slice(1)}
                  </StatusBadge>
                ) : null}
              </SettingRow>
              <SettingRow label="Billing period">
                {billingInfo === undefined ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                ) : billingInfo?.billingCycleStart &&
                  billingInfo?.billingCycleEnd ? (
                  <span className="text-sm text-gray-900">
                    {`${new Date(billingInfo.billingCycleStart * 1000).toLocaleDateString()} – ${new Date(billingInfo.billingCycleEnd * 1000).toLocaleDateString()}`}
                  </span>
                ) : null}
              </SettingRow>
            </div>
          </SettingsSection>

          <SettingsDivider />
        </>
      )}

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
    </div>
  );
}
