export type Arch3rVoiceAssistantTemplate = {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly vapiProfile: 'managed_outbound_sales'
}

/**
 * Managed voice provisioning should always resolve from a repo-owned template
 * catalog so future Vapi sync work has a deterministic source of truth instead
 * of ad-hoc strings spread across campaign code.
 */
export const ARCH3R_VOICE_ASSISTANT_TEMPLATES: readonly Arch3rVoiceAssistantTemplate[] =
  [
    {
      key: 'arch3r-outbound-default',
      name: 'Managed Outbound Default',
      description:
        'Default outbound calling assistant for lead follow-up, qualification, and transcript-driven summaries.',
      vapiProfile: 'managed_outbound_sales',
    },
  ] as const

export const DEFAULT_ARCH3R_VOICE_ASSISTANT_TEMPLATE =
  ARCH3R_VOICE_ASSISTANT_TEMPLATES[0]
