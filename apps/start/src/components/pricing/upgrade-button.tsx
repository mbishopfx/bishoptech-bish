'use client'

import { Link } from '@tanstack/react-router'
import { Button } from '@bish/ui/button'

/**
 * Upgrade button for the chat UI. Links to the pricing page.
 */
export function UpgradeButton() {
  return (
    <Button
      type="button"
      variant="default"
      asChild
      className="text-xs px-4"
    >
      <Link to="/pricing">Upgrade to Plus</Link>
    </Button>
  )
}
