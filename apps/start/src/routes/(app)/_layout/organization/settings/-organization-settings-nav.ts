import { isAreaPath } from '@/utils/nav-utils'
import { Building2, ShieldCheck } from 'lucide-react'

/** Root path for organization-scoped settings area. */
export const ORG_SETTINGS_HREF = '/organization/settings'
export const ORG_SETTINGS_AREA_KEY = 'organization-settings' as const

/** Path matcher used by sidebar to mark organization settings area as active. */
export const isOrgSettingsPath = (pathname: string) =>
  isAreaPath(pathname, ORG_SETTINGS_HREF)

/** Sidebar configuration for organization-level settings pages. */
export const orgSettingsNavArea = () => ({
  title: 'Organization',
  href: ORG_SETTINGS_HREF,
  description: 'Manage organization-wide controls and preferences.',
  icon: Building2,
  content: [
    {
      items: [
        {
          name: 'Model Policy',
          icon: ShieldCheck,
          href: `${ORG_SETTINGS_HREF}/provider-policy`,
          exact: true,
        },
      ],
    },
  ],
})
