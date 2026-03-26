export type ChatSidebarDateGroupKey =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'older'

const DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * Normalizes a timestamp to the start of its local calendar day so bucket
 * boundaries follow the user's timezone instead of UTC midnight.
 */
function startOfLocalDay(timestamp: number): number | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()
}

/**
 * Classifies thread update times into the rolling sidebar buckets used by the
 * chat history list. "Today" and "Yesterday" use local calendar-day boundaries
 * while the older groups use rolling day windows.
 */
export function resolveChatSidebarDateGroup(
  timestamp: number,
  now = Date.now(),
): ChatSidebarDateGroupKey {
  const currentDayStart = startOfLocalDay(now)
  const targetDayStart = startOfLocalDay(timestamp)

  if (currentDayStart === null || targetDayStart === null) {
    return 'older'
  }

  const dayDifference = Math.floor(
    (currentDayStart - targetDayStart) / DAY_IN_MS,
  )

  if (dayDifference <= 0) {
    return 'today'
  }

  if (dayDifference === 1) {
    return 'yesterday'
  }

  if (dayDifference <= 7) {
    return 'last_7_days'
  }

  if (dayDifference <= 30) {
    return 'last_30_days'
  }

  return 'older'
}
