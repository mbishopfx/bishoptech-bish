export type SeatReconciliationMember = {
  memberId: string
  userId: string
  role: string
  createdAt: Date
}

/**
 * Seat-limit reconciliation must be deterministic so webhook retries and
 * manual reconciliation paths always pick the same members. Owners are never
 * auto-restricted, then the newest non-owner members are selected before the
 * newest admins when seats have to be reclaimed.
 */
export function selectRestrictedMembersForSeatLimit(input: {
  members: Array<SeatReconciliationMember>
  seatCount: number
}): Array<SeatReconciliationMember> {
  const normalizedSeatCount = Math.max(1, input.seatCount)
  const excessMemberCount = input.members.length - normalizedSeatCount

  if (excessMemberCount <= 0) {
    return []
  }

  const restrictionCandidates = input.members
    .filter((member) => member.role.toLowerCase() !== 'owner')
    .sort((left, right) => {
      const leftRole = left.role.toLowerCase()
      const rightRole = right.role.toLowerCase()
      const leftPriority = leftRole === 'member' ? 0 : leftRole === 'admin' ? 1 : 2
      const rightPriority = rightRole === 'member' ? 0 : rightRole === 'admin' ? 1 : 2

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      const createdAtDifference = right.createdAt.getTime() - left.createdAt.getTime()
      if (createdAtDifference !== 0) {
        return createdAtDifference
      }

      return right.userId.localeCompare(left.userId)
    })

  return restrictionCandidates.slice(0, excessMemberCount)
}
