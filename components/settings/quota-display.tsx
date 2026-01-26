"use client";

import { Progress } from "@/components/ai/ui/progress";

interface QuotaData {
  currentUsage: number;
  limit: number;
  quotaConfigured: boolean;
}

// Hoist static JSX (Vercel best practice: rendering-hoist-jsx)
const noSubscriptionText = (
  <p className="text-sm text-gray-500 dark:text-text-muted">
    No tienes una suscripción activa
  </p>
);

export function QuotaUsageDisplay({
  currentUsage,
  limit,
  quotaConfigured,
}: QuotaData) {
  if (!quotaConfigured) {
    return noSubscriptionText;
  }

  return (
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {currentUsage}/{limit} usado
    </p>
  );
}

export function QuotaRemainingDisplay({
  currentUsage,
  limit,
  quotaConfigured,
}: QuotaData) {
  if (!quotaConfigured) {
    return null;
  }

  const remaining = limit - currentUsage;

  return (
    <p className="text-sm font-medium text-gray-500 dark:text-text-muted">
      {remaining} mensajes restantes
    </p>
  );
}

export function QuotaProgressDisplay({
  currentUsage,
  limit,
  quotaConfigured,
}: QuotaData) {
  if (!quotaConfigured) {
    return null;
  }

  const percentage = limit > 0 ? Math.min((currentUsage / limit) * 100, 100) : 0;

  return (
    <>
      <Progress value={percentage} className="w-full h-2 [&>div]:bg-accent" />
      <p className="text-xs text-gray-500 dark:text-text-muted">
        {percentage.toFixed(0)}% utilizado
      </p>
    </>
  );
}

// Hoist formatDate function outside component (Vercel best practice: js-cache-function-results)
function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "No disponible";
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-MX', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

export function ResetDateDisplay({ nextResetDate }: { nextResetDate?: number }) {
  return (
    <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
      {formatDate(nextResetDate)}
    </p>
  );
}
