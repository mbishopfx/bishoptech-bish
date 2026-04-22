'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, Share2, Users } from 'lucide-react'
import { useQuery } from '@rocicorp/zero/react'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Badge } from '@bish/ui/badge'
import { cn } from '@bish/utils'
import { toast } from 'sonner'
import { queries } from '@/integrations/zero'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { updateThreadParticipants } from './thread-sharing.functions'
import type { OrgDirectoryRow } from '@/components/organization/settings/members/members-page.logic'

type ThreadShareDialogProps = {
  readonly threadId: string
}

/**
 * Thread sharing stays explicit-member only so collaborative chats remain
 * intentional rather than becoming org-wide by accident.
 */
export function ThreadShareDialog({ threadId }: ThreadShareDialogProps) {
  const { activeOrganizationId, user } = useAppAuth()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [threadRow] = useQuery(
    queries.threads.byId({
      threadId,
      organizationId: activeOrganizationId ?? undefined,
    }),
  )
  const [directory] = useQuery(queries.orgSettings.membersDirectory({}))

  const memberStates = Array.isArray(threadRow?.memberStates)
    ? threadRow.memberStates
    : []
  const participantUserIds = useMemo(
    () =>
      memberStates
        .filter(
          (memberState) =>
            memberState.accessRole === 'participant' &&
            typeof memberState.userId === 'string',
        )
        .map((memberState) => memberState.userId),
    [memberStates],
  )
  const isThreadOwner = useMemo(
    () =>
      memberStates.some(
        (memberState) =>
          memberState.userId === user?.id && memberState.accessRole === 'owner',
      ),
    [memberStates, user?.id],
  )
  const activeMembers = useMemo(
    () => ((directory as OrgDirectoryRow | undefined | null)?.members ?? []),
    [directory],
  )
  const shareableMembers = useMemo(
    () =>
      activeMembers.filter(
        (member) =>
          member.userId !== user?.id &&
          member.access?.status !== 'restricted' &&
          member.user != null,
      ),
    [activeMembers, user?.id],
  )

  useEffect(() => {
    if (!open) return
    setSelectedUserIds(participantUserIds)
  }, [open, participantUserIds])

  const handleToggleUser = (memberUserId: string) => {
    setSelectedUserIds((current) =>
      current.includes(memberUserId)
        ? current.filter((userId) => userId !== memberUserId)
        : [...current, memberUserId],
    )
  }

  const handleSubmit = async () => {
    startTransition(() => {
      void updateThreadParticipants({
        data: {
          threadId,
          participantUserIds: selectedUserIds,
        },
      })
        .then((result) => {
          const message =
            result.participantCount > 0
              ? `Shared this chat with ${result.participantCount} member${result.participantCount === 1 ? '' : 's'}.`
              : 'Sharing removed. This chat is private again.'
          toast.success(message)
          setOpen(false)
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : 'Failed to update sharing.',
          )
        })
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isThreadOwner}
          className="h-9 rounded-full border-border-base bg-surface-base/95 px-3 text-xs font-medium uppercase tracking-[0.16em] text-foreground-primary shadow-sm transition-colors hover:bg-surface-elevated"
        >
          <Share2 className="mr-2 size-3.5" />
          Share
        </Button>
      }
      title="Share chat"
      description="Pick the teammates who should see this thread and continue it with you."
      buttonText="Update access"
      submitButtonDisabled={!isThreadOwner || isPending}
      handleSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'border-border-base',
              participantUserIds.length > 0
                ? 'bg-sky-500/10 text-sky-300'
                : 'bg-surface-base text-foreground-secondary',
            )}
          >
            {participantUserIds.length > 0 ? 'Shared chat' : 'Private chat'}
          </Badge>
          <span className="text-sm text-foreground-secondary">
            Only the original chat owner can hand this thread off to Gemini or Codex.
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-2xl border border-border-base bg-surface-base/80">
          <div className="space-y-2 p-3">
            {shareableMembers.map((member) => {
              const memberUserId = member.userId
              const selected = selectedUserIds.includes(memberUserId)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleToggleUser(memberUserId)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors',
                    selected
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-border-base bg-surface-base hover:bg-surface-elevated',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-foreground-secondary" />
                      <span className="truncate font-medium text-foreground-primary">
                        {member.user?.name || member.user?.email}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground-secondary">
                      {member.user?.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-full border',
                      selected
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : 'border-border-base text-transparent',
                    )}
                  >
                    <Check className="size-4" />
                  </span>
                </button>
              )
            })}
            {shareableMembers.length === 0 ? (
              <p className="text-sm text-foreground-secondary">
                Add more organization members to start sharing chats.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
