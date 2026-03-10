import { isAreaPath } from '@/utils/nav-utils'
import { Activity, Lightbulb } from 'lucide-react'

export const INSIGHT_HREF = '/insight'
export const INSIGHT_AREA_KEY = 'insight' as const

export const isInsightPath = (pathname: string) =>
  isAreaPath(pathname, INSIGHT_HREF)

export const insightNavArea = () => ({
  title: 'Insight',
  href: INSIGHT_HREF,
  description: 'Analytics and insights for your projects.',
  icon: Lightbulb,
  content: [
    { 
      items: [
        {
          name: 'Overview',
          icon: Lightbulb,
          href: INSIGHT_HREF,
          exact: true,
        },
        {
          name: 'Activity',
          icon: Activity,
          href: INSIGHT_HREF + '/activity',
          exact: true,
        },
      ],
    },
  ],
})
