'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bish/ui/select'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import {
  createPlaybook,
  updatePlaybook,
} from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import type { Arch3rPlaybookSummary } from '@/lib/shared/workspace-tools'
import { toast } from 'sonner'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type PlaybooksSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getPlaybooksSnapshot
  >
>

type PlaybookStatus = Arch3rPlaybookSummary['status']

type PlaybookFormState = {
  playbookId: string | null
  title: string
  summary: string
  status: PlaybookStatus
  stepsText: string
}

const EMPTY_FORM_STATE: PlaybookFormState = {
  playbookId: null,
  title: '',
  summary: '',
  status: 'draft',
  stepsText: '',
}

/**
 * Editors only need one text area, but the persisted model needs ordered step
 * records. Blank lines split steps; the first line is the step title and the
 * remaining lines become the detailed instruction body.
 */
function parsePlaybookSteps(stepsText: string) {
  return stepsText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block, index) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      const [titleLine, ...contentLines] = lines
      return {
        title: titleLine || `Step ${index + 1}`,
        content: contentLines.join('\n').trim() || titleLine || `Step ${index + 1}`,
      }
    })
}

function serializePlaybookSteps(playbook: Arch3rPlaybookSummary) {
  return playbook.steps
    .map((step) => `${step.title}\n${step.content}`)
    .join('\n\n')
}

export function PlaybooksPage({
  initialSnapshot,
}: {
  initialSnapshot: PlaybooksSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formState, setFormState] = useState<PlaybookFormState>(EMPTY_FORM_STATE)

  const metrics = useMemo(
    () => [
      {
        label: 'Active',
        value: snapshot.playbooks.filter((playbook) => playbook.status === 'active').length,
        hint: 'Playbooks currently marked ready for day-to-day operational use.',
      },
      {
        label: 'Drafts',
        value: snapshot.playbooks.filter((playbook) => playbook.status === 'draft').length,
        hint: 'Workflows still being refined before they are promoted into active use.',
      },
      {
        label: 'Steps',
        value: snapshot.playbooks.reduce(
          (count, playbook) => count + playbook.steps.length,
          0,
        ),
        hint: 'Ordered instructions currently documented across the shared library.',
      },
    ],
    [snapshot.playbooks],
  )

  const openCreateDialog = () => {
    setFormState(EMPTY_FORM_STATE)
    setIsDialogOpen(true)
  }

  const openEditDialog = (playbook: Arch3rPlaybookSummary) => {
    setFormState({
      playbookId: playbook.id,
      title: playbook.title,
      summary: playbook.summary,
      status: playbook.status,
      stepsText: serializePlaybookSteps(playbook),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    const steps = parsePlaybookSteps(formState.stepsText)
    if (steps.length === 0) {
      toast.error('Add at least one step before saving the playbook.')
      return
    }

    try {
      const nextPlaybooks = formState.playbookId
        ? await updatePlaybook({
            data: {
              playbookId: formState.playbookId,
              title: formState.title,
              summary: formState.summary,
              status: formState.status,
              steps,
            },
          })
        : await createPlaybook({
            data: {
              title: formState.title,
              summary: formState.summary,
              status: formState.status,
              steps,
            },
          })

      setSnapshot({ playbooks: nextPlaybooks })
      setFormState(EMPTY_FORM_STATE)
      setIsDialogOpen(false)
      toast.success(
        formState.playbookId
          ? 'Playbook updated.'
          : 'Playbook created.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save playbook.')
    }
  }

  return (
    <ContentPage
      title="Playbooks"
      description="Reusable SOPs for repeatable delivery, onboarding, and internal operating workflows."
    >
      <WorkspaceMetricGrid metrics={metrics} />

      <WorkspaceSurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
              Library
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
              Shared operating workflows
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
              Use playbooks for the recurring steps you do every week: onboarding,
              campaign launches, QA passes, and handoff checklists.
            </p>
          </div>
          <FormDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setFormState(EMPTY_FORM_STATE)
              }
            }}
            trigger={
              <Button
                type="button"
                size="default"
                className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                onClick={openCreateDialog}
              >
                New Playbook
              </Button>
            }
            title={formState.playbookId ? 'Edit playbook' : 'Create playbook'}
            description="Capture the workflow summary, set its current status, and define the ordered steps below."
            buttonText={formState.playbookId ? 'Save playbook' : 'Create playbook'}
            handleSubmit={handleSubmit}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Weekly launch QA"
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  value={formState.summary}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="What this workflow covers and when the team should use it."
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      status:
                        value === 'active' || value === 'archived'
                          ? value
                          : 'draft',
                    }))
                  }
                >
                  <SelectTrigger size="default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Steps</Label>
                <Textarea
                  value={formState.stepsText}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      stepsText: event.target.value,
                    }))
                  }
                  placeholder={
                    'Kickoff\nConfirm owner, deadline, and success criteria.\n\nQA pass\nRun the smoke checklist and capture blockers.'
                  }
                  className="min-h-56"
                />
                <p className="text-xs text-foreground-secondary">
                  Separate steps with a blank line. The first line becomes the step
                  title and the remaining lines become the detailed instructions.
                </p>
              </div>
            </div>
          </FormDialog>
        </div>
      </WorkspaceSurfaceCard>

      <div className="grid gap-4">
        {snapshot.playbooks.length > 0 ? (
          snapshot.playbooks.map((playbook) => (
            <WorkspaceSurfaceCard key={playbook.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-foreground-primary">
                      {playbook.title}
                    </h3>
                    <Badge variant="outline" className="border-border-base">
                      {playbook.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {playbook.summary}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                  onClick={() => openEditDialog(playbook)}
                >
                  Edit Playbook
                </Button>
              </div>
              <div className="mt-5 grid gap-3">
                {playbook.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="rounded-2xl border border-border-base bg-surface-overlay px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                      Step {index + 1}
                    </p>
                    <h4 className="mt-2 font-semibold text-foreground-primary">
                      {step.title}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-secondary">
                      {step.content}
                    </p>
                  </div>
                ))}
              </div>
            </WorkspaceSurfaceCard>
          ))
        ) : (
          <WorkspaceEmptyState
            title="No playbooks yet."
            description="Create the first SOP to give this workspace a reusable operating rhythm."
          />
        )}
      </div>
    </ContentPage>
  )
}
