import {
  SettingsSection,
  SettingRow,
  StatusBadge,
} from "@/components/settings";
import Pricing from "@/components/landing/subcomponents/pricing";
import { withAuth } from "@workos-inc/authkit-nextjs";

export default async function PlansPage() {
  const { user } = await withAuth();
  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Plans</h1>
      <p className="text-gray-600 mb-8">
        Choose the plan that works best for your workspace.
      </p>

      <div className="space-y-6">
        <Pricing
          user={user}
          showComparisonTable={false}
          containerWidth="wide"
        />
      </div>

      {/* Billing Information */}
      <div className="mt-8">
        <SettingsSection
          title="Billing"
          description="Manage your billing information and payment methods."
        >
          <div className="space-y-4">
            <SettingRow label="Next Payment">
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  $50.00
                </span>
                <div className="text-xs text-gray-500">Due Sep 10, 2025</div>
              </div>
            </SettingRow>

            <SettingRow label="Payment Method">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">•••• 4242</span>
                <StatusBadge status="enabled">Active</StatusBadge>
              </div>
            </SettingRow>

            <SettingRow label="Billing Address">
              <span className="text-sm text-gray-700">
                123 Main Street, New York, NY 10001
              </span>
            </SettingRow>

            <SettingRow label="Invoice History">
              <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">
                View Invoices
              </button>
            </SettingRow>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
