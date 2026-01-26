"use client";

import { Skeleton } from "@/components/ai/ui/skeleton";

export function SettingsSidebarSkeleton() {
  return (
    <div className="w-full md:w-80 bg-background-settings dark:bg-popover-main dark:backdrop-blur-sm h-full md:h-screen overflow-y-auto scrollbar-hide select-none px-4 md:px-0 md:pr-6">
      <nav className="py-6 md:py-12 flex flex-col w-full md:w-48 md:ml-auto">
        <div className="relative">
          <ul className="flex flex-col -mt-1.5 list-none p-0">
            {/* Navigation Sections Skeleton */}
            {[1, 2, 3].map((sectionIndex) => (
              <div key={sectionIndex} className="mb-4">
                <Skeleton className="h-4 w-20 mb-2 ml-2" />
                {[1, 2, 3].map((itemIndex) => (
                  <div key={itemIndex} className="mb-1 ml-2">
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
                {sectionIndex < 3 && (
                  <div className="px-2 my-4">
                    <hr className="border-gray-200 dark:border-border" />
                  </div>
                )}
              </div>
            ))}

            {/* Footer Divider */}
            <div className="px-2 my-2.5">
              <hr className="border-gray-200 dark:border-border" />
            </div>

            {/* Footer Items Skeleton */}
            {[1, 2, 3].map((itemIndex) => (
              <div key={itemIndex} className="mb-1 ml-2">
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}

            {/* Final Divider */}
            <div className="px-2 my-2.5">
              <hr className="border-gray-200 dark:border-border" />
            </div>

            {/* Logout Button Skeleton */}
            <div className="mb-1 ml-2">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </ul>
        </div>
      </nav>
    </div>
  );
}
