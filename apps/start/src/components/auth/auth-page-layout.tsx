'use client'

import { BlobBackgroundGraphic } from '@bish/ui/blob-background-graphic'

/**
 * Shared layout shell for auth-related pages (sign-in, sign-up, accept-invitation,
 */
export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F2F2] dark:bg-[#2A2929] flex items-center justify-center px-4 relative overflow-hidden">
      <img
        src="/shadowfull.webp"
        alt=""
        className="absolute top-0 left-0 w-full h-full z-0 mix-blend-multiply object-cover pointer-events-none dark:hidden"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
        aria-hidden
      >
        <BlobBackgroundGraphic
          className="h-full w-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        />
      </div>
      {children}
    </div>
  )
}
