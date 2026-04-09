'use client'

import { useEffect } from 'react'
import { waitForPageSettled } from '@/lib/frontend/performance/page-settled'
import { initClientPostHog } from '@/lib/frontend/observability/posthog'
import type { PublicPostHogConfig } from '@/lib/shared/observability/posthog-config'

export function PostHogClientBootstrap({
  config,
}: {
  readonly config?: PublicPostHogConfig
}) {
  useEffect(() => {
    let cancelled = false

    void waitForPageSettled().then(() => {
      if (cancelled) {
        return
      }

      void initClientPostHog(config)
    })

    return () => {
      cancelled = true
    }
  }, [config])

  return null
}
