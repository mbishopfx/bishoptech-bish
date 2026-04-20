'use client'

import { Link } from '@tanstack/react-router'
import { Button } from '@bish/ui/button'

export type NavbarDict = {
  goHome: string
  about: string
  pricing: string
  models: string
  mainNavLabel: string
  goToChat: string
}

const defaultNavbarDict: NavbarDict = {
  goHome: 'Go to home',
  about: 'About',
  pricing: 'Pricing',
  models: 'Models',
  mainNavLabel: 'Main navigation',
  goToChat: 'Go to chat',
}

type NavbarAuthButtonsProps = {
  dict?: Partial<NavbarDict>
}

/**
 * Single "Go to chat" button for the navbar. Kept minimal for bundle size.
 */
export function NavbarAuthButtons({ dict: dictOverrides }: NavbarAuthButtonsProps) {
  const dict = { ...defaultNavbarDict, ...dictOverrides }

  return (
    <Link to="/chat">
      <Button variant="default" size="default" className="font-semibold text-white">
        {dict.goToChat}
      </Button>
    </Link>
  )
}
