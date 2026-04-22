'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { FormDialog } from '@bish/ui/dialog'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bish/ui/select'
import { ContentPage } from '@/components/layout'
import {
  getArch3rIntegrationDefinition,
  type Arch3rIntegrationProviderKey,
} from '@/lib/shared/workspace-tools'
import { upsertIntegrationConfig } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { toast } from 'sonner'

type ToolingSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getWorkspaceToolingSnapshot
  >
>

const INTEGRATION_FIELDS: Record<
  Arch3rIntegrationProviderKey,
  ReadonlyArray<{ key: string; label: string; placeholder: string }>
> = {
  social_x: [
    { key: 'clientId', label: 'Override Client ID', placeholder: 'Optional org client id' },
    { key: 'clientSecret', label: 'Override Client Secret', placeholder: 'Optional org client secret' },
  ],
  social_facebook: [
    { key: 'appId', label: 'Override App ID', placeholder: 'Optional org app id' },
    { key: 'appSecret', label: 'Override App Secret', placeholder: 'Optional org app secret' },
  ],
  social_instagram: [
    { key: 'appId', label: 'Override App ID', placeholder: 'Optional org app id' },
    { key: 'appSecret', label: 'Override App Secret', placeholder: 'Optional org app secret' },
  ],
  social_tiktok: [
    { key: 'clientKey', label: 'Override Client Key', placeholder: 'Optional org client key' },
    { key: 'clientSecret', label: 'Override Client Secret', placeholder: 'Optional org client secret' },
  ],
  vapi: [
    { key: 'apiKey', label: 'Vapi API Key', placeholder: 'Required org Vapi API key' },
    { key: 'defaultCallerId', label: 'Default Caller ID', placeholder: 'Optional default number' },
    { key: 'phoneNumber', label: 'Assigned Phone Number', placeholder: 'Optional managed or BYOK number' },
  ],
  twilio: [
    { key: 'accountSid', label: 'Account SID', placeholder: 'Required Twilio account SID' },
    { key: 'authToken', label: 'Auth Token', placeholder: 'Required Twilio auth token' },
    { key: 'messagingServiceSid', label: 'Messaging Service SID', placeholder: 'Optional messaging service sid' },
    { key: 'sipDomain', label: 'SIP Domain', placeholder: 'Optional SIP domain' },
  ],
  google_workspace_export: [
    { key: 'driveFolderId', label: 'Drive Folder ID', placeholder: 'Shared export folder id' },
    { key: 'sheetName', label: 'Default Sheet Name', placeholder: 'Campaign exports' },
  ],
}

function IntegrationEditor({
  providerKey,
  snapshot,
  onSaved,
}: {
  providerKey: Arch3rIntegrationProviderKey
  snapshot: ToolingSnapshot
  onSaved: (next: ToolingSnapshot) => void
}) {
  const definition = getArch3rIntegrationDefinition(providerKey)
  const current =
    snapshot.integrations.find((integration) => integration.providerKey === providerKey) ??
    null
  const [open, setOpen] = useState(false)
  const [authMode, setAuthMode] = useState<
    'platform_default' | 'organization_override'
  >(current?.authMode ?? definition.authMode)
  const [credentialLabel, setCredentialLabel] = useState('')
  const [linkedAccountName, setLinkedAccountName] = useState(
    current?.linkedAccountName ?? '',
  )
  const [linkedAccountExternalId, setLinkedAccountExternalId] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const fields = INTEGRATION_FIELDS[providerKey] ?? []

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="sm">
          Configure
        </Button>
      }
      title={`Configure ${definition.label}`}
      description={definition.description}
      buttonText="Save integration"
      handleSubmit={async () => {
        try {
          const next = await upsertIntegrationConfig({
            data: {
              providerKey,
              authMode,
              credentialLabel,
              linkedAccountName,
              linkedAccountExternalId,
              config: fieldValues,
            },
          })
          onSaved(next as ToolingSnapshot)
          setOpen(false)
          toast.success(`${definition.label} saved for this workspace.`)
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to save integration.',
          )
        }
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Credential mode</Label>
          <Select
            value={authMode}
            onValueChange={(value) =>
              setAuthMode(
                value === 'organization_override'
                  ? 'organization_override'
                  : 'platform_default',
              )
            }
          >
            <SelectTrigger size="default">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform_default">Platform default</SelectItem>
              <SelectItem value="organization_override">
                Organization override
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Credential label</Label>
          <Input
            value={credentialLabel}
            onChange={(event) => setCredentialLabel(event.target.value)}
            placeholder="Primary runtime"
          />
        </div>

        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              value={fieldValues[field.key] ?? ''}
              onChange={(event) =>
                setFieldValues((currentValues) => ({
                  ...currentValues,
                  [field.key]: event.target.value,
                }))
              }
              placeholder={field.placeholder}
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label>Linked account name</Label>
          <Input
            value={linkedAccountName}
            onChange={(event) => setLinkedAccountName(event.target.value)}
            placeholder={current?.linkedAccountLabel ?? 'Optional linked destination'}
          />
        </div>

        <div className="space-y-2">
          <Label>Linked account id</Label>
          <Input
            value={linkedAccountExternalId}
            onChange={(event) => setLinkedAccountExternalId(event.target.value)}
            placeholder="Optional external account id"
          />
        </div>
      </div>
    </FormDialog>
  )
}

export function IntegrationWizardPage({
  initialSnapshot,
}: {
  initialSnapshot: ToolingSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const grouped = useMemo(
    () => ({
      social: snapshot.integrations.filter((integration) =>
        integration.providerKey.startsWith('social_'),
      ),
      runtimes: snapshot.integrations.filter((integration) =>
        ['vapi', 'twilio'].includes(integration.providerKey),
      ),
      exports: snapshot.integrations.filter(
        (integration) => integration.providerKey === 'google_workspace_export',
      ),
    }),
    [snapshot.integrations],
  )

  return (
    <ContentPage
      title="Integration Wizard"
      description="One admin surface for provider credentials, linked destinations, and readiness blocking states."
    >
      {Object.entries(grouped).map(([groupKey, integrations]) => (
        <div key={groupKey} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground-primary capitalize">
              {groupKey === 'runtimes' ? 'Campaign runtimes' : groupKey}
            </h2>
            <p className="text-sm text-foreground-secondary">
              {groupKey === 'social'
                ? 'Social channels can use platform defaults first, then switch to org-owned credentials whenever needed.'
                : groupKey === 'runtimes'
                  ? 'Voice defaults to the ARCH3R-managed runtime and can flip to BYOK, while SMS remains customer-owned.'
                  : 'Exports use the shared organization destination, not personal accounts.'}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {integrations.map((integration) => (
              <div
                key={integration.providerKey}
                className="rounded-[28px] border border-border-base bg-surface-strong p-3"
              >
                <div className="rounded-[22px] bg-surface-base px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground-primary">
                        {integration.label}
                      </h3>
                      <p className="mt-2 text-sm text-foreground-secondary">
                        {integration.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border-base">
                      {integration.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-border-base">
                      {integration.authMode === 'platform_default'
                        ? 'Platform defaults allowed'
                        : 'Org-owned required'}
                    </Badge>
                    {integration.linkedAccountName ? (
                      <Badge variant="outline" className="border-border-base">
                        {integration.linkedAccountName}
                      </Badge>
                    ) : null}
                  </div>
                  {integration.missingEnv.length > 0 ? (
                    <p className="mt-3 text-xs text-foreground-secondary">
                      Missing env: {integration.missingEnv.join(', ')}
                    </p>
                  ) : null}
                  <div className="mt-5">
                    <IntegrationEditor
                      providerKey={integration.providerKey}
                      snapshot={snapshot}
                      onSaved={setSnapshot}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </ContentPage>
  )
}
