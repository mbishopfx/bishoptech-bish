import { isAreaPath } from '@/utils/nav-utils'
import { LayoutDashboard } from 'lucide-react'

export const OPERATOR_HREF = '/operator'
export const OPERATOR_AREA_KEY = 'operator' as const

export const isOperatorPath = (pathname: string) =>
  isAreaPath(pathname, OPERATOR_HREF)

export const operatorNavArea = () => ({
  title: 'Operator',
  href: OPERATOR_HREF,
  description: 'Organization dashboard for member activity, tools, campaigns, and shared workspace posture.',
  icon: LayoutDashboard,
  content: [
    {
      name: '',
      items: [
        {
          name: 'Overview',
          icon: LayoutDashboard,
          href: OPERATOR_HREF,
          exact: true,
        },
        {
          name: 'Platform Control',
          href: `${OPERATOR_HREF}/platform`,
          exact: true,
        },
      ],
    },
  ],
})
