'use client'

import { useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Textarea } from '@bish/ui/textarea'
import { ContentPage } from '@/components/layout'
import { createSmsCampaign } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type SmsSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getSmsCampaignSnapshot
  >
>

export function SmsCampaignsPage({
  initialSnapshot,
}: {
  initialSnapshot: SmsSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [campaignName, setCampaignName] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleCreateCampaign = async () => {
    if (!selectedFile) {
      toast.error('Choose a CSV file first.')
      return
    }
    try {
      const csvContent = await selectedFile.text()
      const nextCampaigns = await createSmsCampaign({
        data: {
          campaignName,
          messageTemplate,
          csvFileName: selectedFile.name,
          csvContent,
        },
      })
      setSnapshot((current) => ({
        ...current,
        campaigns: nextCampaigns as SmsSnapshot['campaigns'],
      }))
      setCampaignName('')
      setMessageTemplate('')
      setSelectedFile(null)
      toast.success('SMS campaign batch imported.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to import SMS campaign.',
      )
    }
  }

  return (
    <ContentPage
      title="SMS Campaigns"
      description="Twilio-powered outreach batches with list import, message template control, and delivery logging."
    >
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Campaigns',
            value: snapshot.campaigns.length,
            hint: 'Tracked SMS campaign groups currently visible in the org.',
          },
          {
            label: 'Recipients',
            value: snapshot.campaigns.reduce(
              (count, campaign) => count + campaign.rowCount,
              0,
            ),
            hint: 'Imported recipient rows staged for delivery logging.',
          },
          {
            label: 'Delivery States',
            value: snapshot.campaigns.reduce(
              (count, campaign) => count + campaign.deliveryStatuses.length,
              0,
            ),
            hint: 'Status buckets captured across queued, sent, failed, and reply states.',
          },
        ]}
      />

      <WorkspaceSurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
              Messaging
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
              SMS runtime
            </h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Twilio credentials stay organization-owned, while the workspace keeps campaign lists, logs, and replies inside one workspace lane.
            </p>
          </div>
          <FormDialog
            trigger={
              <Button
                size="default"
                className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
              >
                Import Recipients
              </Button>
            }
            title="Create SMS campaign"
            description="Upload a CSV list, choose the base message, and the workspace will create a tracked batch."
            buttonText="Create campaign"
            handleSubmit={handleCreateCampaign}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder="Nurture Follow-up"
                />
              </div>
              <div className="space-y-2">
                <Label>Message template</Label>
                <Textarea
                  value={messageTemplate}
                  onChange={(event) => setMessageTemplate(event.target.value)}
                  placeholder="Hi {{name}}, quick follow-up from the workspace..."
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
                    {campaign.messageTemplate}
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
                {campaign.deliveryStatuses.map((entry) => (
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
            title="No SMS campaigns imported yet."
            description="Import a first recipient batch to turn this lane into a tracked outreach workflow."
          />
        )}
      </div>
    </ContentPage>
  )
}
