'use client'

import { useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { ContentPage } from '@/components/layout'
import { createVoiceCampaign } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type VoiceSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getVoiceCampaignSnapshot
  >
>

export function VoiceCampaignsPage({
  initialSnapshot,
}: {
  initialSnapshot: VoiceSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [campaignName, setCampaignName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleCreateCampaign = async () => {
    if (!selectedFile) {
      toast.error('Choose a CSV file first.')
      return
    }
    try {
      const csvContent = await selectedFile.text()
      const nextSnapshot = await createVoiceCampaign({
        data: {
          campaignName,
          csvFileName: selectedFile.name,
          csvContent,
        },
      })
      setSnapshot((current) => ({
        ...current,
        campaigns: (nextSnapshot as VoiceSnapshot).campaigns,
        assistants: (nextSnapshot as VoiceSnapshot).assistants,
      }))
      setCampaignName('')
      setSelectedFile(null)
      toast.success('Voice campaign batch imported.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to import campaign CSV.',
      )
    }
  }

  return (
    <ContentPage
      title="Voice Campaigns"
      description="Cloud-run Vapi campaign scaffolds with managed-or-BYOK runtime ownership, CSV import, transcript capture, and shared export readiness."
    >
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Assistants',
            value: snapshot.assistants.length,
            hint: 'Org-scoped assistant instances tracked against the active runtime mode.',
          },
          {
            label: 'Campaigns',
            value: snapshot.campaigns.length,
            hint: 'Voice campaign batches visible inside the shared workspace.',
          },
          {
            label: 'Imported Leads',
            value: snapshot.campaigns.reduce(
              (count, campaign) => count + campaign.rowCount,
              0,
            ),
            hint: 'CSV lead rows already mapped into campaign batches.',
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {snapshot.assistants.length > 0 ? (
          snapshot.assistants.map((assistant) => (
            <WorkspaceSurfaceCard key={assistant.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground-primary">
                    {assistant.assistantTemplateKey}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {assistant.providerMode === 'managed'
                      ? 'Using the managed Vapi runtime.'
                      : 'Using an organization-provided Vapi runtime.'}
                  </p>
                </div>
                <Badge variant="outline" className="border-border-base">
                  {assistant.provisioningStatus}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border-base">
                  {assistant.providerMode}
                </Badge>
                {assistant.externalAssistantId ? (
                  <Badge variant="outline" className="border-border-base">
                    Assistant ID ready
                  </Badge>
                ) : null}
                {assistant.phoneNumber ? (
                  <Badge variant="outline" className="border-border-base">
                    {assistant.phoneNumber}
                  </Badge>
                ) : null}
              </div>
            </WorkspaceSurfaceCard>
          ))
        ) : (
          <WorkspaceEmptyState
            className="xl:col-span-3"
            title="No voice assistant instances exist yet."
            description="The first campaign import will create the tracked assistant runtime for this organization."
          />
        )}
      </div>

      <WorkspaceSurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
              Outbound calls
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
              Outbound calling
            </h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Vapi runs in the cloud. CSV import creates org-scoped lead batches and ties every campaign back to a managed or BYOK assistant instance.
            </p>
          </div>
          <FormDialog
            trigger={
              <Button
                size="default"
                className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
              >
                Import Leads
              </Button>
            }
            title="Create voice campaign"
            description="Upload a CSV list and the workspace will build a campaign batch against the locked default assistant template."
            buttonText="Create campaign"
            handleSubmit={handleCreateCampaign}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder="April Follow-up Calls"
                />
              </div>
              <div className="space-y-2">
                <Label>CSV file</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
            </div>
          </FormDialog>
        </div>
      </WorkspaceSurfaceCard>

      <div className="grid gap-4">
        {snapshot.campaigns.length > 0 ? (
          snapshot.campaigns.map((campaign) => (
            <WorkspaceSurfaceCard key={campaign.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-foreground-primary">
                    {campaign.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    Template: {campaign.assistantTemplateKey}
                  </p>
                </div>
                <Badge variant="outline" className="border-border-base">
                  {campaign.status}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border-base">
                  {campaign.rowCount} imported rows
                </Badge>
                <Badge variant="outline" className="border-border-base">
                  {campaign.providerMode}
                </Badge>
                <Badge variant="outline" className="border-border-base">
                  {campaign.provisioningStatus}
                </Badge>
                {campaign.phoneNumber ? (
                  <Badge variant="outline" className="border-border-base">
                    {campaign.phoneNumber}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="border-border-base">
                  {campaign.transcriptSummaryCount} summaries
                </Badge>
                {campaign.callStatuses.map((entry) => (
                  <Badge
                    key={`${campaign.id}-${entry.status}`}
                    variant="outline"
                    className="border-border-base"
                  >
                    {entry.status}: {entry.count}
                  </Badge>
                ))}
              </div>
            </WorkspaceSurfaceCard>
          ))
        ) : (
          <WorkspaceEmptyState
            title="No voice campaigns imported yet."
            description="Import the first CSV lead batch to stand up the initial voice workflow."
          />
        )}
      </div>
    </ContentPage>
  )
}
