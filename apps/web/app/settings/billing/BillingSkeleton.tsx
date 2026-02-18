import { Skeleton } from "@rift/ui/skeleton";

export function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Plan Card */}
      <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Plan Actual
            </h3>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-border/50">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-text-muted mb-2">
              Inicio ciclo de facturación
            </p>
            <div className="flex flex-col space-y-1 text-gray-900 dark:text-white text-sm">
              <Skeleton className="h-5 w-40" />
              <p className="text-sm font-medium text-gray-500 dark:text-text-muted mb-2">Vence el</p>
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-9 w-40 rounded-md" />
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-text-muted mb-2">
              Método de Pago
            </p>
            <div className="flex items-center text-gray-900 dark:text-white mb-4">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-5 w-32" />
            </div>

            <p className="text-sm font-medium text-gray-500 dark:text-text-muted mb-2">
               Pago mensual actual
            </p>
            <div className="flex items-center text-gray-900 dark:text-white">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-20 ml-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
