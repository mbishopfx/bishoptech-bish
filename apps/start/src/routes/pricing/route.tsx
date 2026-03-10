import { createFileRoute } from '@tanstack/react-router'
import { PricingPageLayout } from '@/components/pricing/pricing-page-layout'
import { PricingPage } from '@/components/pricing/pricing-page'

/**
 * Pricing page route. Renders outside the dashboard layout at /pricing.
 */
export const Route = createFileRoute('/pricing')({
  component: PricingRouteComponent,
})

function PricingRouteComponent() {
  return (
    <PricingPageLayout>
      <PricingPage />
    </PricingPageLayout>
  )
}
