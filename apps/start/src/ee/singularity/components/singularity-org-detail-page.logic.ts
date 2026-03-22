'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { getWorkspacePlan } from '@/lib/shared/access-control'
import type { WorkspacePlanId } from '@/lib/shared/access-control'
import type { SingularityOrganizationDetail } from '@/ee/singularity/shared/singularity-admin'
import {
  cancelSingularityInvitation,
  inviteSingularityOrganizationMember,
  removeSingularityOrganizationMember,
  setSingularityOrganizationPlan,
  updateSingularityOrganizationMemberRole,
} from '@/ee/singularity/frontend/singularity.functions'

type SingularityRole = 'admin' | 'member'

export type SingularityOrgDetailPageLogicResult = {
  inviteEmail: string
  inviteRole: SingularityRole
  selectedPlan: WorkspacePlanId
  selectedSeatCount: string
  isSeatCountValid: boolean
  isPending: boolean
  activePlanName: string
  setInviteEmail: (value: string) => void
  setInviteRole: (value: SingularityRole) => void
  setSelectedPlan: (value: WorkspacePlanId) => void
  setSelectedSeatCount: (value: string) => void
  handleInvite: () => Promise<void>
  handleRoleChange: (memberId: string, role: SingularityRole) => Promise<void>
  handleRemoveMember: (memberId: string) => Promise<void>
  handleCancelInvitation: (invitationId: string) => Promise<void>
  handleSetPlan: () => Promise<void>
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useSingularityOrgDetailPageLogic(
  organization: SingularityOrganizationDetail,
): SingularityOrgDetailPageLogicResult {
  const router = useRouter()
  const inviteMemberFn = useServerFn(inviteSingularityOrganizationMember)
  const removeMemberFn = useServerFn(removeSingularityOrganizationMember)
  const updateMemberRoleFn = useServerFn(
    updateSingularityOrganizationMemberRole,
  )
  const cancelInvitationFn = useServerFn(cancelSingularityInvitation)
  const setPlanFn = useServerFn(setSingularityOrganizationPlan)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<SingularityRole>('member')
  const [selectedPlan, setSelectedPlan] = useState<WorkspacePlanId>(
    organization.planId,
  )
  /**
   * Keep the seat count as raw text so operators can edit naturally while we
   * still validate before submitting the override mutation.
   */
  const [selectedSeatCount, setSelectedSeatCount] = useState<string>(
    String(organization.seatCount),
  )
  const [isPending, startTransition] = useTransition()

  const activePlanName = useMemo(
    () => getWorkspacePlan(organization.planId).name,
    [organization.planId],
  )
  const parsedSeatCount = Number.parseInt(selectedSeatCount, 10)
  const isSeatCountValid =
    Number.isFinite(parsedSeatCount) &&
    Number.isInteger(parsedSeatCount) &&
    parsedSeatCount >= 1

  /**
   * Wrap async mutations in a transition while still returning a promise that
   * callers such as dialogs can await for close/reset behavior.
   */
  const runTransitionAction = (action: () => Promise<void>): Promise<void> =>
    new Promise((resolve) => {
      startTransition(() => {
        void (async () => {
          try {
            await action()
          } finally {
            resolve()
          }
        })()
      })
    })

  const refreshRoute = async () => {
    await router.invalidate()
  }

  const handleInvite = () =>
    runTransitionAction(async () => {
      try {
        await inviteMemberFn({
          data: {
            organizationId: organization.organizationId,
            email: inviteEmail,
            role: inviteRole,
          },
        })
        setInviteEmail('')
        setInviteRole('member')
        toast.success('Invitation sent.')
        await refreshRoute()
      } catch (error) {
        toast.error(toErrorMessage(error, 'Failed to invite user.'))
      }
    })

  const handleRoleChange = (memberId: string, role: SingularityRole) =>
    runTransitionAction(async () => {
      try {
        await updateMemberRoleFn({
          data: {
            organizationId: organization.organizationId,
            memberId,
            role,
          },
        })
        toast.success('Member role updated.')
        await refreshRoute()
      } catch (error) {
        toast.error(toErrorMessage(error, 'Failed to update role.'))
      }
    })

  const handleRemoveMember = (memberId: string) =>
    runTransitionAction(async () => {
      try {
        await removeMemberFn({
          data: {
            organizationId: organization.organizationId,
            memberIdOrEmail: memberId,
          },
        })
        toast.success('Member removed.')
        await refreshRoute()
      } catch (error) {
        toast.error(toErrorMessage(error, 'Failed to remove member.'))
      }
    })

  const handleCancelInvitation = (invitationId: string) =>
    runTransitionAction(async () => {
      try {
        await cancelInvitationFn({
          data: { invitationId },
        })
        toast.success('Invitation cancelled.')
        await refreshRoute()
      } catch (error) {
        toast.error(toErrorMessage(error, 'Failed to cancel invitation.'))
      }
    })

  const handleSetPlan = () =>
    runTransitionAction(async () => {
      if (!isSeatCountValid) {
        toast.error('Seat count must be a whole number greater than or equal to 1.')
        return
      }

      try {
        await setPlanFn({
          data: {
            organizationId: organization.organizationId,
            planId: selectedPlan,
            seatCount: parsedSeatCount,
          },
        })
        toast.success('Plan override applied.')
        await refreshRoute()
      } catch (error) {
        toast.error(toErrorMessage(error, 'Failed to update plan.'))
      }
    })

  return {
    inviteEmail,
    inviteRole,
    selectedPlan,
    selectedSeatCount,
    isSeatCountValid,
    isPending,
    activePlanName,
    setInviteEmail,
    setInviteRole,
    setSelectedPlan,
    setSelectedSeatCount,
    handleInvite,
    handleRoleChange,
    handleRemoveMember,
    handleCancelInvitation,
    handleSetPlan,
  }
}
