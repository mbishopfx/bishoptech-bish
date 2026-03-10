import { cn } from '@rift/utils'
import type {
  SidebarNavAreaConfig,
  SidebarNavAreas,
  SidebarNavData,
} from './app-sidebar-nav.config'
import { SidebarAreaLayout } from './sidebar-area-layout'

/**
 * Renders the area panel from config.
 * One Area per key; only the currentArea is visible. Each area has title + sections.
 */
export function SidebarAreaPanel({
  areas,
  currentArea,
  data,
}: {
  areas: SidebarNavAreas
  currentArea: string | null
  data: SidebarNavData
}) {
  if (!currentArea) {
    return null
  }

  const areaFactory = areas[currentArea]
  if (!areaFactory) {
    return null
  }

  const config = areaFactory(data)

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <Area config={config} data={data} />
    </div>
  )
}

function Area({
  config,
  data,
}: {
  config: SidebarNavAreaConfig
  data: SidebarNavData
}) {
  const { ContentComponent, title, content } = config
  return (
    <div className={cn('relative flex min-h-0 size-full flex-col')}>
      {ContentComponent ? (
        <ContentComponent pathname={data.pathname} />
      ) : (
        <SidebarAreaLayout
          title={title}
          sections={content ?? []}
          pathname={data.pathname}
        />
      )}
    </div>
  )
}
