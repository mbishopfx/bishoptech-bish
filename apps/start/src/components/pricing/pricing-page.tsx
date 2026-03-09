'use client'

import { PricingSection } from './pricing-section'
import { PricingComparisonTable } from './pricing-comparison-table'

/**
 * Pricing page content. Renders the pricing cards followed by the comparative
 * matrix so users can scan plan differences without leaving the pricing view.
 */
export function PricingPage() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4">
      <PricingSection />
      <PricingComparisonTable />
    </div>
  )
}
