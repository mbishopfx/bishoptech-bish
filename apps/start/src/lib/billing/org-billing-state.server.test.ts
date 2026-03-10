import { describe, expect, it } from 'vitest'
import {
  selectRestrictedMembersForSeatLimit,
} from './member-seat-restrictions'

function buildMember(input: {
  memberId: string
  userId: string
  role: string
  createdAt: string
}) {
  return {
    memberId: input.memberId,
    userId: input.userId,
    role: input.role,
    createdAt: new Date(input.createdAt),
  }
}

describe('selectRestrictedMembersForSeatLimit', () => {
  it('does not restrict anyone when the seat count still covers all members', () => {
    const restrictedMembers = selectRestrictedMembersForSeatLimit({
      seatCount: 3,
      members: [
        buildMember({
          memberId: 'm_owner',
          userId: 'u_owner',
          role: 'owner',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        buildMember({
          memberId: 'm_member_1',
          userId: 'u_member_1',
          role: 'member',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
      ],
    })

    expect(restrictedMembers).toHaveLength(0)
  })

  it('restricts the newest non-owner members before any admins', () => {
    const restrictedMembers = selectRestrictedMembersForSeatLimit({
      seatCount: 2,
      members: [
        buildMember({
          memberId: 'm_owner',
          userId: 'u_owner',
          role: 'owner',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        buildMember({
          memberId: 'm_admin',
          userId: 'u_admin',
          role: 'admin',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
        buildMember({
          memberId: 'm_member_old',
          userId: 'u_member_old',
          role: 'member',
          createdAt: '2026-01-03T00:00:00.000Z',
        }),
        buildMember({
          memberId: 'm_member_new',
          userId: 'u_member_new',
          role: 'member',
          createdAt: '2026-01-04T00:00:00.000Z',
        }),
      ],
    })

    expect(restrictedMembers.map((member) => member.userId)).toEqual([
      'u_member_new',
      'u_member_old',
    ])
  })

  it('preserves owners even when the workspace is still over limit afterwards', () => {
    const restrictedMembers = selectRestrictedMembersForSeatLimit({
      seatCount: 1,
      members: [
        buildMember({
          memberId: 'm_owner_1',
          userId: 'u_owner_1',
          role: 'owner',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        buildMember({
          memberId: 'm_owner_2',
          userId: 'u_owner_2',
          role: 'owner',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
      ],
    })

    expect(restrictedMembers).toHaveLength(0)
  })
})
