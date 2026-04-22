import {
  createSchema,
  table,
  string,
  number,
  boolean,
  json,
  enumeration,
  relationships,
} from '@rocicorp/zero'
import type { ChatErrorCode } from '@/lib/shared/chat-contracts/error-codes'
import type { ChatErrorI18nKey } from '@/lib/shared/chat-contracts/error-i18n'

// ---------------------------------------------------------------------------
// Table definitions
// ---------------------------------------------------------------------------

/**
 * Better Auth stores organization membership data in the same Postgres
 * database as the rest of the app. These table definitions intentionally map
 * only the fields needed by the members settings page so Zero can serve the
 * directory locally without duplicating the full auth model.
 */
const user = table('user')
  .from('user')
  .columns({
    id: string(),
    name: string(),
    email: string(),
    image: string().optional(),
  })
  .primaryKey('id')

const organization = table('organization')
  .from('organization')
  .columns({
    id: string(),
    name: string(),
    slug: string(),
    logo: string().optional(),
  })
  .primaryKey('id')

const member = table('member')
  .from('member')
  .columns({
    id: string(),
    organizationId: string(),
    userId: string(),
    role: string(),
  })
  .primaryKey('id')

const invitation = table('invitation')
  .from('invitation')
  .columns({
    id: string(),
    organizationId: string(),
    email: string(),
    role: string(),
    status: string(),
  })
  .primaryKey('id')

const orgAiPolicy = table('orgAiPolicy')
  .from('org_ai_policy')
  .columns({
    id: string(),
    organizationId: string().from('organization_id'),
    disabledProviderIds: json<readonly string[]>()
      .from('disabled_provider_ids'),
    disabledModelIds: json<readonly string[]>().from('disabled_model_ids'),
    complianceFlags: json<Record<string, boolean>>().from('compliance_flags'),
    providerNativeToolsEnabled: boolean()
      .from('provider_native_tools_enabled')
      .optional(),
    externalToolsEnabled: boolean().from('external_tools_enabled').optional(),
    disabledToolKeys: json<readonly string[]>()
      .from('disabled_tool_keys'),
    orgKnowledgeEnabled: boolean().from('org_knowledge_enabled').optional(),
    providerKeyStatus: json<{
      syncedAt: number
      hasAnyProviderKey: boolean
      providers: {
        openai: boolean
        anthropic: boolean
      }
    }>().from('provider_key_status'),
    enforcedModeId: string().from('enforced_mode_id').optional(),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const orgBillingAccount = table('orgBillingAccount')
  .from('org_billing_account')
  .columns({
    id: string(),
    organizationId: string().from('organization_id'),
    provider: string(),
    providerCustomerId: string().from('provider_customer_id').optional(),
    status: string(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const orgSubscription = table('orgSubscription')
  .from('org_subscription')
  .columns({
    id: string(),
    organizationId: string().from('organization_id'),
    billingAccountId: string().from('billing_account_id'),
    providerSubscriptionId: string().from('provider_subscription_id').optional(),
    planId: string().from('plan_id'),
    billingInterval: string().from('billing_interval').optional(),
    seatCount: number().from('seat_count').optional(),
    status: string(),
    currentPeriodStart: number().from('current_period_start').optional(),
    currentPeriodEnd: number().from('current_period_end').optional(),
    cancelAtPeriodEnd: boolean().from('cancel_at_period_end').optional(),
    scheduledPlanId: string().from('scheduled_plan_id').optional(),
    scheduledSeatCount: number().from('scheduled_seat_count').optional(),
    scheduledChangeEffectiveAt: number()
      .from('scheduled_change_effective_at')
      .optional(),
    pendingChangeReason: string().from('pending_change_reason').optional(),
    metadata: json<Record<string, string | number | boolean | null>>(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const orgEntitlementSnapshot = table('orgEntitlementSnapshot')
  .from('org_entitlement_snapshot')
  .columns({
    organizationId: string().from('organization_id'),
    planId: string().from('plan_id'),
    billingProvider: string().from('billing_provider'),
    subscriptionStatus: string().from('subscription_status'),
    seatCount: number().from('seat_count').optional(),
    activeMemberCount: number().from('active_member_count'),
    pendingInvitationCount: number().from('pending_invitation_count'),
    isOverSeatLimit: boolean().from('is_over_seat_limit'),
    effectiveFeatures: json<Record<string, boolean | string | number>>()
      .from('effective_features'),
    usagePolicy: json<Record<string, boolean | string | number>>()
      .from('usage_policy'),
    usageSyncStatus: string().from('usage_sync_status'),
    usageSyncError: string().from('usage_sync_error').optional(),
    computedAt: number().from('computed_at'),
    version: number(),
  })
  .primaryKey('organizationId')

const orgMemberAccess = table('orgMemberAccess')
  .from('org_member_access')
  .columns({
    id: string(),
    organizationId: string().from('organization_id'),
    userId: string().from('user_id'),
    status: string(),
    reasonCode: string().from('reason_code').optional(),
    suspendedAt: number().from('suspended_at').optional(),
    reactivatedAt: number().from('reactivated_at').optional(),
    sourceSubscriptionId: string().from('source_subscription_id').optional(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const orgUserUsageSummary = table('orgUserUsageSummary')
  .from('org_user_usage_summary')
  .columns({
    id: string(),
    organizationId: string().from('organization_id'),
    userId: string().from('user_id'),
    kind: enumeration<'free' | 'paid'>(),
    seatIndex: number().from('seat_index').optional(),
    monthlyUsedPercent: number().from('monthly_used_percent'),
    monthlyRemainingPercent: number().from('monthly_remaining_percent'),
    monthlyResetAt: number().from('monthly_reset_at'),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const thread = table('thread')
  .from('threads')
  .columns({
    id: string(),
    threadId: string().from('thread_id'),
    title: string(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
    lastMessageAt: number().from('last_message_at'),
    generationStatus: enumeration<
      'pending' | 'generation' | 'completed' | 'failed'
    >()
      .from('generation_status'),
    visibility: enumeration<'visible' | 'archived'>(),
    userSetTitle: boolean().from('user_set_title').optional(),
    userId: string().from('user_id'),
    model: string(),
    reasoningEffort: enumeration<
      'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    >()
      .from('reasoning_effort')
      .optional(),
    responseStyle: enumeration<
      'regular' | 'learning' | 'technical' | 'concise'
    >()
      .from('response_style')
      .optional(),
    pinned: boolean(),
    activeChildByParent: json<Record<string, string>>()
      .from('active_child_by_parent'),
    branchVersion: number().from('branch_version'),
    shareId: string().from('share_id').optional(),
    shareStatus: enumeration<'active' | 'revoked'>()
      .from('share_status')
      .optional(),
    sharedAt: number().from('shared_at').optional(),
    allowAttachments: boolean().from('allow_attachments').optional(),
    orgOnly: boolean().from('org_only').optional(),
    shareName: boolean().from('share_name').optional(),
    ownerOrgId: string().from('owner_org_id').optional(),
    customInstructionId: string().from('custom_instruction_id').optional(),
    modeId: string().from('mode_id').optional(),
    disabledToolKeys: json<readonly string[]>()
      .from('disabled_tool_keys')
      .optional(),
    contextWindowMode: enumeration<'standard' | 'max'>()
      .from('context_window_mode')
      .optional(),
    modelSwitchPending: boolean().from('model_switch_pending').optional(),
    lastModelSwitchAt: number().from('last_model_switch_at').optional(),
    lastModelSwitchFrom: string().from('last_model_switch_from').optional(),
  })
  .primaryKey('id')

const threadMemberState = table('threadMemberState')
  .from('thread_member_state')
  .columns({
    id: string(),
    threadId: string().from('thread_id'),
    organizationId: string().from('organization_id'),
    userId: string().from('user_id'),
    accessRole: enumeration<'owner' | 'participant'>().from('access_role'),
    visibility: enumeration<'visible' | 'archived'>(),
    addedByUserId: string().from('added_by_user_id').optional(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const message = table('message')
  .from('messages')
  .columns({
    id: string(),
    messageId: string().from('message_id'),
    threadId: string().from('thread_id'),
    userId: string().from('user_id'),
    reasoning: string().optional(),
    content: string(),
    status: enumeration<
      | 'waiting'
      | 'thinking'
      | 'streaming'
      | 'done'
      | 'error'
      | 'error.rejected'
      | 'deleted'
      | 'cancelled'
    >(),
    updated_at: number().optional(),
    parentMessageId: string().from('parent_message_id').optional(),
    branchIndex: number().from('branch_index'),
    branchAnchorMessageId: string()
      .from('branch_anchor_message_id')
      .optional(),
    regenSourceMessageId: string()
      .from('regen_source_message_id')
      .optional(),
    role: enumeration<'user' | 'assistant' | 'system'>(),
    created_at: number(),
    serverError: json<{
      type: string
      message: string
      code?: ChatErrorCode
      i18nKey?: ChatErrorI18nKey
    }>()
      .from('server_error')
      .optional(),
    model: string(),
    attachmentsIds: json<readonly string[]>().from('attachments_ids'),
    sources: json<
      readonly { sourceId: string; url: string; title?: string }[]
    >().optional(),
    modelParams: json<{
      temperature?: number
      topP?: number
      topK?: number
      reasoningEffort?:
        | 'none'
        | 'minimal'
        | 'low'
        | 'medium'
        | 'high'
        | 'xhigh'
        | 'max'
      includeSearch?: boolean
    }>()
      .from('model_params')
      .optional(),
    providerMetadata: json().from('provider_metadata').optional(),
    generationMetadata: json().from('generation_metadata').optional(),
    publicCost: number().from('public_cost').optional(),
    inputTokens: number().from('input_tokens').optional(),
    outputTokens: number().from('output_tokens').optional(),
    totalTokens: number().from('total_tokens').optional(),
    reasoningTokens: number().from('reasoning_tokens').optional(),
    textTokens: number().from('text_tokens').optional(),
    cacheReadTokens: number().from('cache_read_tokens').optional(),
    cacheWriteTokens: number().from('cache_write_tokens').optional(),
    noCacheTokens: number().from('no_cache_tokens').optional(),
    billableWebSearchCalls: number()
      .from('billable_web_search_calls')
      .optional(),
  })
  .primaryKey('id')

const attachment = table('attachment')
  .from('attachments')
  .columns({
    id: string(),
    messageId: string().from('message_id').optional(),
    threadId: string().from('thread_id').optional(),
    userId: string().from('user_id'),
    fileKey: string().from('file_key'),
    attachmentUrl: string().from('attachment_url'),
    fileName: string().from('file_name'),
    mimeType: string().from('mime_type'),
    fileSize: number().from('file_size'),
    embeddingStatus: string().from('embedding_status').optional(),
    ownerOrgId: string().from('owner_org_id').optional(),
    workspaceId: string().from('workspace_id').optional(),
    accessScope: enumeration<'user' | 'workspace' | 'org'>()
      .from('access_scope')
      .optional(),
    orgKnowledgeKind: string().from('org_knowledge_kind').optional(),
    orgKnowledgeActive: boolean().from('org_knowledge_active').optional(),
    orgKnowledgeSourceLane: string().from('org_knowledge_source_lane').optional(),
    orgKnowledgeSourceLabel: string().from('org_knowledge_source_label').optional(),
    orgKnowledgeSourceRef: string().from('org_knowledge_source_ref').optional(),
    orgKnowledgeMetadata: json<Record<string, unknown>>()
      .from('org_knowledge_metadata')
      .optional(),
    accessGroupIds: json<readonly string[]>().from('access_group_ids').optional(),
    vectorIndexedAt: number().from('vector_indexed_at').optional(),
    vectorError: string().from('vector_error').optional(),
    status: enumeration<'deleted' | 'uploaded'>().optional(),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const huddleRoom = table('huddleRoom')
  .from('huddle_room')
  .columns({
    id: string(),
    roomId: string().from('room_id'),
    organizationId: string().from('organization_id'),
    threadId: string().from('thread_id').optional(),
    name: string(),
    roomType: enumeration<'thread' | 'named'>().from('room_type'),
    status: enumeration<'active' | 'archived'>(),
    createdByUserId: string().from('created_by_user_id'),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const huddleMember = table('huddleMember')
  .from('huddle_member')
  .columns({
    id: string(),
    roomId: string().from('room_id'),
    userId: string().from('user_id'),
    memberRole: enumeration<'host' | 'member'>().from('member_role'),
    isMuted: boolean().from('is_muted'),
    sessionId: string().from('session_id').optional(),
    audioEnabled: boolean().from('audio_enabled'),
    isSpeaking: boolean().from('is_speaking'),
    audioLevel: number().from('audio_level'),
    connectionState: string().from('connection_state'),
    joinedAt: number().from('joined_at'),
    lastSeenAt: number().from('last_seen_at'),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

const huddleSignal = table('huddleSignal')
  .from('huddle_signal')
  .columns({
    id: string(),
    roomId: string().from('room_id'),
    senderUserId: string().from('sender_user_id'),
    senderSessionId: string().from('sender_session_id'),
    recipientUserId: string().from('recipient_user_id'),
    signalType: string().from('signal_type'),
    payload: string(),
    createdAt: number().from('created_at'),
  })
  .primaryKey('id')

const huddleReaction = table('huddleReaction')
  .from('huddle_reaction')
  .columns({
    id: string(),
    roomId: string().from('room_id'),
    userId: string().from('user_id'),
    kind: string(),
    createdAt: number().from('created_at'),
  })
  .primaryKey('id')

const huddleNote = table('huddleNote')
  .from('huddle_note')
  .columns({
    id: string(),
    roomId: string().from('room_id'),
    organizationId: string().from('organization_id'),
    createdByUserId: string().from('created_by_user_id'),
    title: string(),
    content: string(),
    color: string(),
    positionX: number().from('position_x'),
    positionY: number().from('position_y'),
    createdAt: number().from('created_at'),
    updatedAt: number().from('updated_at'),
  })
  .primaryKey('id')

// ---------------------------------------------------------------------------
// Relationships (optional; use for .related() in ZQL)
// ---------------------------------------------------------------------------

const organizationRelationships = relationships(organization, ({ many }) => ({
  members: many({
    sourceField: ['id'],
    destSchema: member,
    destField: ['organizationId'],
  }),
  invitations: many({
    sourceField: ['id'],
    destSchema: invitation,
    destField: ['organizationId'],
  }),
  billingAccounts: many({
    sourceField: ['id'],
    destSchema: orgBillingAccount,
    destField: ['organizationId'],
  }),
  subscriptions: many({
    sourceField: ['id'],
    destSchema: orgSubscription,
    destField: ['organizationId'],
  }),
  entitlementSnapshots: many({
    sourceField: ['id'],
    destSchema: orgEntitlementSnapshot,
    destField: ['organizationId'],
  }),
  orgAiPolicies: many({
    sourceField: ['id'],
    destSchema: orgAiPolicy,
    destField: ['organizationId'],
  }),
  memberAccess: many({
    sourceField: ['id'],
    destSchema: orgMemberAccess,
    destField: ['organizationId'],
  }),
  usageSummaries: many({
    sourceField: ['id'],
    destSchema: orgUserUsageSummary,
    destField: ['organizationId'],
  }),
}))

const memberRelationships = relationships(member, ({ one }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
  user: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
  access: one({
    sourceField: ['organizationId', 'userId'],
    destField: ['organizationId', 'userId'],
    destSchema: orgMemberAccess,
  }),
}))

const threadRelationships = relationships(thread, ({ many, one }) => ({
  owner: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
  memberStates: many({
    sourceField: ['threadId'],
    destSchema: threadMemberState,
    destField: ['threadId'],
  }),
}))

const threadMemberStateRelationships = relationships(threadMemberState, ({ one }) => ({
  thread: one({
    sourceField: ['threadId'],
    destField: ['threadId'],
    destSchema: thread,
  }),
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
  user: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
  addedByUser: one({
    sourceField: ['addedByUserId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

const orgAiPolicyRelationships = relationships(orgAiPolicy, ({ one }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
}))

const attachmentRelationships = relationships(attachment, ({ one }) => ({
  organization: one({
    sourceField: ['ownerOrgId'],
    destField: ['id'],
    destSchema: organization,
  }),
}))

const orgSubscriptionRelationships = relationships(orgSubscription, ({ one }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
  billingAccount: one({
    sourceField: ['billingAccountId'],
    destField: ['id'],
    destSchema: orgBillingAccount,
  }),
}))

const orgUserUsageSummaryRelationships = relationships(orgUserUsageSummary, ({ one }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
}))

const messageRelationships = relationships(message, ({ one }) => ({
  thread: one({
    sourceField: ['threadId'],
    destField: ['threadId'],
    destSchema: thread,
  }),
  author: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

const huddleRoomRelationships = relationships(huddleRoom, ({ many, one }) => ({
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
  thread: one({
    sourceField: ['threadId'],
    destField: ['threadId'],
    destSchema: thread,
  }),
  createdByUser: one({
    sourceField: ['createdByUserId'],
    destField: ['id'],
    destSchema: user,
  }),
  members: many({
    sourceField: ['roomId'],
    destSchema: huddleMember,
    destField: ['roomId'],
  }),
  reactions: many({
    sourceField: ['roomId'],
    destSchema: huddleReaction,
    destField: ['roomId'],
  }),
  signals: many({
    sourceField: ['roomId'],
    destSchema: huddleSignal,
    destField: ['roomId'],
  }),
  notes: many({
    sourceField: ['roomId'],
    destSchema: huddleNote,
    destField: ['roomId'],
  }),
}))

const huddleMemberRelationships = relationships(huddleMember, ({ one }) => ({
  room: one({
    sourceField: ['roomId'],
    destField: ['roomId'],
    destSchema: huddleRoom,
  }),
  user: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

const huddleReactionRelationships = relationships(huddleReaction, ({ one }) => ({
  room: one({
    sourceField: ['roomId'],
    destField: ['roomId'],
    destSchema: huddleRoom,
  }),
  user: one({
    sourceField: ['userId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

const huddleSignalRelationships = relationships(huddleSignal, ({ one }) => ({
  room: one({
    sourceField: ['roomId'],
    destField: ['roomId'],
    destSchema: huddleRoom,
  }),
  senderUser: one({
    sourceField: ['senderUserId'],
    destField: ['id'],
    destSchema: user,
  }),
  recipientUser: one({
    sourceField: ['recipientUserId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

const huddleNoteRelationships = relationships(huddleNote, ({ one }) => ({
  room: one({
    sourceField: ['roomId'],
    destField: ['roomId'],
    destSchema: huddleRoom,
  }),
  organization: one({
    sourceField: ['organizationId'],
    destField: ['id'],
    destSchema: organization,
  }),
  createdByUser: one({
    sourceField: ['createdByUserId'],
    destField: ['id'],
    destSchema: user,
  }),
}))

// ---------------------------------------------------------------------------
// Schema export and default types
// ---------------------------------------------------------------------------

export const schema = createSchema({
  tables: [
    user,
    organization,
    member,
    invitation,
    orgAiPolicy,
    orgBillingAccount,
    orgSubscription,
    orgEntitlementSnapshot,
    orgMemberAccess,
    orgUserUsageSummary,
    thread,
    threadMemberState,
    message,
    attachment,
    huddleRoom,
    huddleMember,
    huddleSignal,
    huddleReaction,
    huddleNote,
  ],
  relationships: [
    organizationRelationships,
    memberRelationships,
    threadRelationships,
    threadMemberStateRelationships,
    orgAiPolicyRelationships,
    attachmentRelationships,
    orgSubscriptionRelationships,
    orgUserUsageSummaryRelationships,
    messageRelationships,
    huddleRoomRelationships,
    huddleMemberRelationships,
    huddleSignalRelationships,
    huddleReactionRelationships,
    huddleNoteRelationships,
  ],
})

export type Schema = typeof schema

/**
 * Auth context passed through Zero query/mutate endpoints.
 * `organizationId` is optional because users can browse without an active org,
 * but org-scoped queries/mutators must explicitly guard against that case.
 */
export type ZeroContext = {
  userID: string
  organizationId?: string
  isAnonymous: boolean
}

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    schema: Schema
    context: ZeroContext
  }
}
