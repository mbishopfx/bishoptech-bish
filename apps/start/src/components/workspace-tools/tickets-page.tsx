'use client'

import { useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bish/ui/select'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import {
  createTicket,
  decideTicket,
} from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type TicketsSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getTicketsSnapshot
  >
>

export function TicketsPage({
  initialSnapshot,
}: {
  initialSnapshot: TicketsSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>(
    'medium',
  )

  const handleCreateTicket = async () => {
    try {
      const nextTickets = await createTicket({
        data: {
          title,
          description,
          severity,
        },
      })
      setSnapshot((current) => ({
        ...current,
        tickets: nextTickets,
      }))
      setTitle('')
      setDescription('')
      setSeverity('medium')
      toast.success('Ticket created for triage.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket.')
    }
  }

  const handleDecision = async (ticketId: string, decision: 'approved' | 'denied') => {
    try {
      const nextTickets = await decideTicket({
        data: {
          ticketId,
          decision,
          projectTitle: decision === 'approved' ? 'Approved Ticket Project' : undefined,
        },
      })
      setSnapshot((current) => ({
        ...current,
        tickets: nextTickets,
      }))
      toast.success(
        decision === 'approved'
          ? 'Ticket approved and promoted into a project.'
          : 'Ticket denied.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update ticket.')
    }
  }

  return (
    <ContentPage
      title="Ticket Triage"
      description="Internal issue intake that can be approved into projects or denied with a clear operator decision."
    >
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Submitted',
            value: snapshot.tickets.filter((ticket) => ticket.status === 'submitted').length,
            hint: 'Tickets still waiting on a triage decision.',
          },
          {
            label: 'Approved',
            value: snapshot.tickets.filter((ticket) => ticket.status === 'approved').length,
            hint: 'Requests that have already been promoted into project work.',
          },
          {
            label: 'Critical',
            value: snapshot.tickets.filter((ticket) => ticket.severity === 'critical').length,
            hint: 'Highest-severity items currently visible in the org queue.',
          },
        ]}
      />

      <WorkspaceSurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
              Intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
              Intake queue
            </h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Tickets are private by default and only become project work after approval.
            </p>
          </div>
          <FormDialog
            trigger={
              <Button
                size="default"
                className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
              >
                New Ticket
              </Button>
            }
            title="Create ticket"
            description="Capture the problem, assign a severity, and let the org decide whether it becomes a project."
            buttonText="Create"
            handleSubmit={handleCreateTicket}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Need a project dashboard export"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the issue or request."
                />
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(value) =>
                    setSeverity(
                      value === 'low' || value === 'high' || value === 'critical'
                        ? value
                        : 'medium',
                    )
                  }
                >
                  <SelectTrigger size="default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormDialog>
        </div>
      </WorkspaceSurfaceCard>

      <div className="grid gap-4">
        {snapshot.tickets.length > 0 ? (
          snapshot.tickets.map((ticket) => (
            <WorkspaceSurfaceCard key={ticket.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-foreground-primary">
                    {ticket.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {ticket.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border-base">
                    {ticket.status}
                  </Badge>
                  <Badge variant="outline" className="border-border-base">
                    {ticket.severity}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="default"
                  className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                  onClick={() => handleDecision(ticket.id, 'approved')}
                  disabled={ticket.status !== 'submitted'}
                >
                  Approve to Project
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                  onClick={() => handleDecision(ticket.id, 'denied')}
                  disabled={ticket.status !== 'submitted'}
                >
                  Deny
                </Button>
                {ticket.approvedProjectId ? (
                  <Badge variant="outline" className="border-border-base">
                    Project linked
                  </Badge>
                ) : null}
              </div>
            </WorkspaceSurfaceCard>
          ))
        ) : (
          <WorkspaceEmptyState
            title="No tickets yet."
            description="Create the first intake item to start the triage flow."
          />
        )}
      </div>
    </ContentPage>
  )
}
