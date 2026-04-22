import { Mic } from 'lucide-react'
import { isAreaPath } from '@/utils/nav-utils'

export const HUDDLE_HREF = '/huddle'
export const HUDDLE_AREA_KEY = 'huddle' as const

export const isHuddlePath = (pathname: string) => isAreaPath(pathname, HUDDLE_HREF)

export const huddleNavArea = () => ({
  title: 'Huddle',
  href: HUDDLE_HREF,
  description: 'Open-floor collaboration rooms with live notes and reactions.',
  icon: Mic,
  content: [
    {
      items: [
        {
          name: 'Active rooms',
          icon: Mic,
          href: HUDDLE_HREF,
          exact: true,
        },
      ],
    },
  ],
})
