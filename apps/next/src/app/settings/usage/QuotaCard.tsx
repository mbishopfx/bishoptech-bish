"use client";

import {
  QuotaUsageDisplay,
  QuotaRemainingDisplay,
  QuotaProgressDisplay,
  ResetDateDisplay,
} from "@/components/settings/quota-display";

interface QuotaData {
  currentUsage: number;
  limit: number;
  quotaConfigured: boolean;
}

// Hoist static card wrapper JSX (Vercel best practice: rendering-hoist-jsx)
const cardWrapper = "p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm";

export function QuotaCard({
  type,
  data,
  nextResetDate,
}: {
  type: "standard" | "premium" | "reset";
  data?: QuotaData;
  nextResetDate?: number;
}) {
  // Reset date card
  if (type === "reset") {
    return (
      <div className={cardWrapper}>
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Próximo Reinicio
              </p>
            </div>
            <ResetDateDisplay nextResetDate={nextResetDate} />
          </div>
        </div>
      </div>
    );
  }

  // Quota cards (standard/premium)
  if (!data) return null;

  const title = type === "standard" ? "Standard" : "Premium";

  return (
    <div className={cardWrapper}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-medium text-base leading-6 text-gray-900 dark:text-white">
            {title}
          </h3>
          <QuotaUsageDisplay
            currentUsage={data.currentUsage}
            limit={data.limit}
            quotaConfigured={data.quotaConfigured}
          />
          <QuotaRemainingDisplay
            currentUsage={data.currentUsage}
            limit={data.limit}
            quotaConfigured={data.quotaConfigured}
          />
        </div>
        <div className="space-y-2">
          <QuotaProgressDisplay
            currentUsage={data.currentUsage}
            limit={data.limit}
            quotaConfigured={data.quotaConfigured}
          />
        </div>
      </div>
    </div>
  );
}
