import { describe, expect, it } from 'vitest'
import { resolveChatSidebarDateGroup } from './chat-sidebar-date-groups'

const NOW = new Date(2026, 2, 26, 15, 0, 0, 0).getTime()

describe('resolveChatSidebarDateGroup', () => {
  it('groups timestamps from the current day as today', () => {
    const sameDay = new Date(2026, 2, 26, 9, 30, 0, 0).getTime()

    expect(resolveChatSidebarDateGroup(sameDay, NOW)).toBe('today')
  })

  it('groups timestamps from the previous local day as yesterday', () => {
    const previousDay = new Date(2026, 2, 25, 23, 59, 0, 0).getTime()

    expect(resolveChatSidebarDateGroup(previousDay, NOW)).toBe('yesterday')
  })

  it('groups timestamps from two to seven days ago as last 7 days', () => {
    const sixDaysAgo = new Date(2026, 2, 20, 12, 0, 0, 0).getTime()

    expect(resolveChatSidebarDateGroup(sixDaysAgo, NOW)).toBe('last_7_days')
  })

  it('groups timestamps from eight to thirty days ago as last 30 days', () => {
    const tenDaysAgo = new Date(2026, 2, 16, 12, 0, 0, 0).getTime()

    expect(resolveChatSidebarDateGroup(tenDaysAgo, NOW)).toBe('last_30_days')
  })

  it('groups older timestamps into the older bucket', () => {
    const thirtyOneDaysAgo = new Date(2026, 1, 23, 12, 0, 0, 0).getTime()

    expect(resolveChatSidebarDateGroup(thirtyOneDaysAgo, NOW)).toBe('older')
  })

  it('falls back safely for invalid timestamps', () => {
    expect(resolveChatSidebarDateGroup(Number.NaN, NOW)).toBe('older')
    expect(resolveChatSidebarDateGroup(-1, NOW)).toBe('older')
  })
})
