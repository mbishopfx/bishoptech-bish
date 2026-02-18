import { Skeleton } from "@rift/ui/skeleton";

// Hoist static skeleton JSX (Vercel best practice: rendering-hoist-jsx)
const cardWrapper = "p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm";

export function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Standard Quota Card */}
        <div className={cardWrapper}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Standard
              </h3>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>

        {/* Premium Quota Card */}
        <div className={cardWrapper}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Premium
              </h3>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Reset Date Card */}
      <div className={cardWrapper}>
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Próximo Reinicio
              </p>
            </div>
            <Skeleton className="h-5 w-48 mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
