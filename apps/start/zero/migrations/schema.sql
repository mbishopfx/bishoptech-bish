CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Zero upstream schema (run against ZERO_UPSTREAM_DB).
-- Single source of truth for a fresh DB. zero-cache replicates via publication
-- zero_data (created by zero-dev-reset after applying this file).
--
-- Execution order: Run db:reset (Better Auth migrate first, then zero-dev-reset)
-- so user/organization/member/invitation exist before this schema runs.

-- instance_settings
CREATE TABLE IF NOT EXISTS instance_settings (
  id TEXT PRIMARY KEY,
  setup_completed_at TIMESTAMPTZ,
  first_admin_user_id TEXT,
  signup_policy TEXT NOT NULL DEFAULT 'invite_only',
  signup_secret_hash TEXT,
  public_app_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS first_admin_user_id TEXT;
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS signup_policy TEXT NOT NULL DEFAULT 'invite_only';
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS signup_secret_hash TEXT;
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS public_app_locked BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE instance_settings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$
BEGIN
  ALTER TABLE instance_settings
  ADD CONSTRAINT instance_settings_signup_policy_check
  CHECK (signup_policy IN ('invite_only', 'shared_secret', 'open'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
INSERT INTO instance_settings (
  id,
  signup_policy,
  public_app_locked
)
VALUES (
  'default',
  'invite_only',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- threads
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_message_at BIGINT NOT NULL,
  generation_status TEXT NOT NULL,
  visibility TEXT NOT NULL,
  user_set_title BOOLEAN,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  response_style TEXT,
  pinned BOOLEAN NOT NULL,
  active_child_by_parent JSONB NOT NULL DEFAULT '{}'::jsonb,
  branch_version BIGINT NOT NULL DEFAULT 1,
  share_id TEXT,
  share_status TEXT,
  shared_at BIGINT,
  allow_attachments BOOLEAN,
  org_only BOOLEAN,
  share_name BOOLEAN,
  owner_org_id TEXT,
  custom_instruction_id TEXT,
  reasoning_effort TEXT,
  mode_id TEXT,
  disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_window_mode TEXT NOT NULL DEFAULT 'standard'
);
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS active_child_by_parent JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS branch_version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS mode_id TEXT;
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS context_window_mode TEXT NOT NULL DEFAULT 'standard';
CREATE INDEX IF NOT EXISTS threads_user_id ON threads (user_id);
CREATE INDEX IF NOT EXISTS threads_thread_id ON threads (thread_id);
CREATE INDEX IF NOT EXISTS threads_user_updated ON threads (user_id, updated_at);
CREATE INDEX IF NOT EXISTS threads_user_org_visibility_updated
  ON threads (user_id, owner_org_id, visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS threads_share_id ON threads (share_id);
CREATE INDEX IF NOT EXISTS threads_reasoning_effort ON threads (reasoning_effort);
CREATE INDEX IF NOT EXISTS threads_context_window_mode ON threads (context_window_mode);
CREATE INDEX IF NOT EXISTS threads_title_search_fts
  ON threads
  USING GIN (to_tsvector('simple', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS threads_title_search_trgm
  ON threads
  USING GIN (LOWER(title) gin_trgm_ops);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reasoning TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at BIGINT,
  parent_message_id TEXT,
  branch_index INTEGER NOT NULL DEFAULT 1,
  branch_anchor_message_id TEXT,
  regen_source_message_id TEXT,
  role TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  server_error JSONB,
  model TEXT NOT NULL,
  attachments_ids JSONB NOT NULL,
  sources JSONB,
  model_params JSONB,
  provider_metadata JSONB,
  generation_metadata JSONB,
  ai_cost DOUBLE PRECISION,
  public_cost DOUBLE PRECISION,
  used_byok BOOLEAN,
  input_tokens BIGINT,
  output_tokens BIGINT,
  total_tokens BIGINT,
  reasoning_tokens BIGINT,
  text_tokens BIGINT,
  cache_read_tokens BIGINT,
  cache_write_tokens BIGINT,
  no_cache_tokens BIGINT,
  billable_web_search_calls BIGINT
);
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS parent_message_id TEXT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS branch_index INTEGER NOT NULL DEFAULT 1;
DO $$
BEGIN
  ALTER TABLE messages
  ADD CONSTRAINT messages_branch_index_positive CHECK (branch_index >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS branch_anchor_message_id TEXT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS regen_source_message_id TEXT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS generation_metadata JSONB;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS ai_cost DOUBLE PRECISION;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS public_cost DOUBLE PRECISION;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS used_byok BOOLEAN;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS input_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS output_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS total_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reasoning_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS text_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS cache_read_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS cache_write_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS no_cache_tokens BIGINT;
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS billable_web_search_calls BIGINT;
CREATE INDEX IF NOT EXISTS messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS messages_thread_user ON messages (thread_id, user_id);
CREATE INDEX IF NOT EXISTS messages_user ON messages (user_id);
CREATE INDEX IF NOT EXISTS messages_thread_created ON messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS messages_thread_parent ON messages (thread_id, parent_message_id);
CREATE INDEX IF NOT EXISTS messages_user_ai_cost ON messages (user_id, ai_cost);
CREATE INDEX IF NOT EXISTS messages_user_public_cost ON messages (user_id, public_cost);
CREATE INDEX IF NOT EXISTS messages_user_total_tokens ON messages (user_id, total_tokens);
CREATE INDEX IF NOT EXISTS messages_content_search_fts
  ON messages
  USING GIN (to_tsvector('simple', COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS messages_content_search_trgm
  ON messages
  USING GIN (LOWER(content) gin_trgm_ops)
  WHERE status = 'done' AND role IN ('user', 'assistant');
CREATE INDEX IF NOT EXISTS messages_user_created_desc
  ON messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_user_thread_search_scope
  ON messages (user_id, thread_id, created_at DESC)
  WHERE status = 'done' AND role IN ('user', 'assistant');

-- org_ai_policy
CREATE TABLE IF NOT EXISTS org_ai_policy (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  disabled_provider_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  disabled_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  compliance_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_native_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  external_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  org_knowledge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  active_org_knowledge_count BIGINT NOT NULL DEFAULT 0,
  provider_key_status JSONB NOT NULL DEFAULT '{"syncedAt": 0, "hasAnyProviderKey": false, "providers": {"openai": false, "anthropic": false}}'::jsonb,
  enforced_mode_id TEXT,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at BIGINT NOT NULL
);
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS provider_key_status JSONB NOT NULL DEFAULT '{"syncedAt": 0, "hasAnyProviderKey": false, "providers": {"openai": false, "anthropic": false}}'::jsonb;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS enforced_mode_id TEXT;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS provider_native_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS external_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS org_knowledge_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS active_org_knowledge_count BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS org_ai_policy_organization_id ON org_ai_policy (organization_id);
CREATE INDEX IF NOT EXISTS org_ai_policy_updated_at ON org_ai_policy (updated_at);

-- org_provider_api_key
CREATE TABLE IF NOT EXISTS org_provider_api_key (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_provider_api_key_org_provider_unique
  ON org_provider_api_key (organization_id, provider_id);
CREATE INDEX IF NOT EXISTS org_provider_api_key_org_idx
  ON org_provider_api_key (organization_id);

-- org_billing_account
CREATE TABLE IF NOT EXISTS org_billing_account (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_billing_account_organization_id ON org_billing_account (organization_id);

-- org_subscription
CREATE TABLE IF NOT EXISTS org_subscription (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  billing_account_id TEXT NOT NULL,
  provider_subscription_id TEXT,
  plan_id TEXT NOT NULL,
  billing_interval TEXT,
  seat_count INTEGER,
  status TEXT NOT NULL,
  current_period_start BIGINT,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_plan_id TEXT,
  scheduled_seat_count INTEGER,
  scheduled_change_effective_at BIGINT,
  pending_change_reason TEXT,
  usage_policy_template_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_subscription_organization_id ON org_subscription (organization_id);
CREATE INDEX IF NOT EXISTS org_subscription_billing_account_id ON org_subscription (billing_account_id);
CREATE INDEX IF NOT EXISTS org_subscription_status ON org_subscription (status);

-- org_entitlement_snapshot
CREATE TABLE IF NOT EXISTS org_entitlement_snapshot (
  organization_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  billing_provider TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  seat_count INTEGER,
  active_member_count INTEGER NOT NULL DEFAULT 0,
  pending_invitation_count INTEGER NOT NULL DEFAULT 0,
  is_over_seat_limit BOOLEAN NOT NULL DEFAULT FALSE,
  effective_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_sync_status TEXT NOT NULL DEFAULT 'ok',
  usage_sync_error TEXT,
  computed_at BIGINT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1
);

-- org_member_access
CREATE TABLE IF NOT EXISTS org_member_access (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason_code TEXT,
  suspended_at BIGINT,
  reactivated_at BIGINT,
  source_subscription_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_member_access_org_user ON org_member_access (organization_id, user_id);
CREATE INDEX IF NOT EXISTS org_member_access_status ON org_member_access (status);

-- Better Auth owns user/organization; we add app-specific columns. Run db:reset so
-- auth migrations run first and these tables exist.
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE organization
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
  "periodStart" TIMESTAMPTZ,
  "periodEnd" TIMESTAMPTZ,
  "trialStart" TIMESTAMPTZ,
  "trialEnd" TIMESTAMPTZ,
  "cancelAtPeriodEnd" BOOLEAN DEFAULT FALSE,
  "cancelAt" TIMESTAMPTZ,
  "canceledAt" TIMESTAMPTZ,
  "endedAt" TIMESTAMPTZ,
  seats INTEGER,
  "billingInterval" TEXT,
  "stripeScheduleId" TEXT
);
CREATE INDEX IF NOT EXISTS subscription_reference_id ON subscription ("referenceId");
CREATE INDEX IF NOT EXISTS subscription_stripe_subscription_id ON subscription ("stripeSubscriptionId");

CREATE OR REPLACE FUNCTION org_current_seat_limit(target_organization_id TEXT)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT coalesce(
    (
      SELECT GREATEST(coalesce(seat_count, 1), 1)
      FROM org_subscription
      WHERE organization_id = target_organization_id
        AND status IN ('active', 'trialing', 'past_due')
      ORDER BY updated_at DESC
      LIMIT 1
    ),
    1
  );
$$;

CREATE OR REPLACE FUNCTION enforce_pending_invitation_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seat_limit INTEGER;
  active_member_count INTEGER;
  pending_invitation_count INTEGER;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'pending'
     AND OLD."organizationId" = NEW."organizationId" THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM organization
  WHERE id = NEW."organizationId"
  FOR UPDATE;

  seat_limit := org_current_seat_limit(NEW."organizationId");

  SELECT count(*)::int
  INTO active_member_count
  FROM member
  WHERE "organizationId" = NEW."organizationId";

  SELECT count(*)::int
  INTO pending_invitation_count
  FROM invitation
  WHERE "organizationId" = NEW."organizationId"
    AND status = 'pending'
    AND id <> coalesce(NEW.id, '');

  IF active_member_count + pending_invitation_count + 1 > seat_limit THEN
    RAISE EXCEPTION 'Organization seat limit reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitation_seat_limit_guard ON invitation;
CREATE TRIGGER invitation_seat_limit_guard
BEFORE INSERT OR UPDATE OF status, "organizationId"
ON invitation
FOR EACH ROW
EXECUTE FUNCTION enforce_pending_invitation_seat_limit();

CREATE OR REPLACE FUNCTION enforce_active_member_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seat_limit INTEGER;
  active_member_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."organizationId" = NEW."organizationId" THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM organization
  WHERE id = NEW."organizationId"
  FOR UPDATE;

  seat_limit := org_current_seat_limit(NEW."organizationId");

  SELECT count(*)::int
  INTO active_member_count
  FROM member
  WHERE "organizationId" = NEW."organizationId"
    AND id <> coalesce(NEW.id, '');

  IF active_member_count + 1 > seat_limit THEN
    RAISE EXCEPTION 'Organization seat limit reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_seat_limit_guard ON member;
CREATE TRIGGER member_seat_limit_guard
BEFORE INSERT OR UPDATE OF "organizationId"
ON member
FOR EACH ROW
EXECUTE FUNCTION enforce_active_member_seat_limit();

-- usage_policy_template
CREATE TABLE IF NOT EXISTS usage_policy_template (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  target_margin_ratio_bps INTEGER NOT NULL,
  reserve_headroom_ratio_bps INTEGER NOT NULL,
  min_reserve_nano_usd BIGINT NOT NULL,
  max_reserve_nano_usd BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS usage_policy_template_plan_feature ON usage_policy_template (plan_id, feature_key);

-- org_usage_policy_override
CREATE TABLE IF NOT EXISTS org_usage_policy_override (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  target_margin_ratio_bps INTEGER,
  reserve_headroom_ratio_bps INTEGER,
  min_reserve_nano_usd BIGINT,
  organization_monthly_budget_nano_usd BIGINT,
  max_reserve_nano_usd BIGINT,
  enabled BOOLEAN,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_usage_policy_override_org_feature ON org_usage_policy_override (organization_id, feature_key);

-- org_seat_slot
CREATE TABLE IF NOT EXISTS org_seat_slot (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  org_subscription_id TEXT,
  plan_id TEXT NOT NULL,
  cycle_start_at BIGINT NOT NULL,
  cycle_end_at BIGINT NOT NULL,
  seat_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  current_assignee_user_id TEXT,
  first_assigned_at BIGINT,
  last_assigned_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_slot_unique_cycle_index ON org_seat_slot (organization_id, cycle_start_at, cycle_end_at, seat_index);
CREATE INDEX IF NOT EXISTS org_seat_slot_org_assignee ON org_seat_slot (organization_id, current_assignee_user_id);

-- org_seat_slot_assignment
CREATE TABLE IF NOT EXISTS org_seat_slot_assignment (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cycle_start_at BIGINT NOT NULL,
  cycle_end_at BIGINT NOT NULL,
  assignment_status TEXT NOT NULL,
  assigned_at BIGINT NOT NULL,
  released_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_seat_slot_assignment_org_user ON org_seat_slot_assignment (organization_id, user_id, cycle_start_at);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_slot_assignment_active_slot ON org_seat_slot_assignment (seat_slot_id) WHERE assignment_status = 'active';

-- org_seat_bucket_balance
CREATE TABLE IF NOT EXISTS org_seat_bucket_balance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  bucket_type TEXT NOT NULL,
  total_nano_usd BIGINT NOT NULL,
  remaining_nano_usd BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_bucket_balance_slot_bucket ON org_seat_bucket_balance (seat_slot_id, bucket_type);

-- org_seat_bucket_ledger
CREATE TABLE IF NOT EXISTS org_seat_bucket_ledger (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  bucket_balance_id TEXT NOT NULL,
  reservation_id TEXT,
  monetization_event_id TEXT,
  entry_type TEXT NOT NULL,
  amount_nano_usd BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_seat_bucket_ledger_bucket_balance ON org_seat_bucket_ledger (bucket_balance_id, created_at);

-- org_usage_reservation
CREATE TABLE IF NOT EXISTS org_usage_reservation (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_nano_usd BIGINT NOT NULL,
  reserved_nano_usd BIGINT NOT NULL,
  released_nano_usd BIGINT NOT NULL DEFAULT 0,
  allocation JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_code TEXT,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_usage_reservation_org_status ON org_usage_reservation (organization_id, status, expires_at);

-- org_usage_event
CREATE TABLE IF NOT EXISTS org_usage_event (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT,
  assistant_message_id TEXT,
  model_id TEXT NOT NULL,
  used_byok BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_nano_usd BIGINT,
  actual_nano_usd BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_usage_event_org_created_at ON org_usage_event (organization_id, created_at);

-- org_monetization_event
CREATE TABLE IF NOT EXISTS org_monetization_event (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT,
  usage_event_id TEXT,
  reservation_id TEXT,
  estimated_nano_usd BIGINT NOT NULL,
  actual_nano_usd BIGINT NOT NULL,
  captured_nano_usd BIGINT NOT NULL DEFAULT 0,
  refunded_nano_usd BIGINT NOT NULL DEFAULT 0,
  forgiven_nano_usd BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_monetization_event_org_status ON org_monetization_event (organization_id, status, updated_at);

-- org_user_usage_summary
CREATE TABLE IF NOT EXISTS org_user_usage_summary (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('free', 'paid')),
  seat_index INTEGER,
  monthly_used_percent BIGINT NOT NULL,
  monthly_remaining_percent BIGINT NOT NULL,
  monthly_reset_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_user_usage_summary_org_user ON org_user_usage_summary (organization_id, user_id);
CREATE INDEX IF NOT EXISTS org_user_usage_summary_org_updated_at ON org_user_usage_summary (organization_id, updated_at);

-- chat_request_rate_limit_window
CREATE TABLE IF NOT EXISTS chat_request_rate_limit_window (
  user_id TEXT NOT NULL,
  window_started_at BIGINT NOT NULL,
  hits INTEGER NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, window_started_at)
);

-- chat_free_allowance_window
CREATE TABLE IF NOT EXISTS chat_free_allowance_window (
  user_id TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  window_started_at BIGINT NOT NULL,
  hits INTEGER NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, policy_key, window_started_at)
);

-- attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  thread_id TEXT,
  user_id TEXT NOT NULL,
  file_key TEXT NOT NULL,
  attachment_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_content TEXT NOT NULL,
  status TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  embedding_model TEXT,
  embedding_tokens BIGINT,
  embedding_dimensions BIGINT,
  embedding_chunks BIGINT,
  embedding_status TEXT,
  owner_org_id TEXT,
  workspace_id TEXT,
  access_scope TEXT DEFAULT 'user',
  org_knowledge_kind TEXT,
  org_knowledge_active BOOLEAN NOT NULL DEFAULT FALSE,
  org_knowledge_source_lane TEXT,
  org_knowledge_source_label TEXT,
  org_knowledge_source_ref TEXT,
  org_knowledge_metadata JSONB,
  access_group_ids JSONB,
  vector_indexed_at BIGINT,
  vector_error TEXT
);
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_kind TEXT;
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_lane TEXT;
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_label TEXT;
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_ref TEXT;
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_metadata JSONB;
CREATE INDEX IF NOT EXISTS attachments_thread_id ON attachments (thread_id);
CREATE INDEX IF NOT EXISTS attachments_message_id ON attachments (message_id);
CREATE INDEX IF NOT EXISTS attachments_user_id ON attachments (user_id);
CREATE INDEX IF NOT EXISTS attachments_org_knowledge_lookup
  ON attachments (owner_org_id, org_knowledge_kind, org_knowledge_active, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS attachments_org_knowledge_source_lookup
  ON attachments (owner_org_id, org_knowledge_source_lane, org_knowledge_source_ref, updated_at DESC);

-- connector_accounts
CREATE TABLE IF NOT EXISTS connector_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  status TEXT NOT NULL,
  external_account_id TEXT,
  display_name TEXT NOT NULL,
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  token_expires_at BIGINT,
  scope_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_accounts_org_provider
  ON connector_accounts (organization_id, provider, updated_at DESC);

-- connector_scopes
CREATE TABLE IF NOT EXISTS connector_scopes (
  id TEXT PRIMARY KEY,
  connector_account_id TEXT NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  scope_key TEXT NOT NULL,
  scope_label TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS connector_scopes_account_scope
  ON connector_scopes (connector_account_id, scope_key);

-- connector_cursors
CREATE TABLE IF NOT EXISTS connector_cursors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  source_ref TEXT NOT NULL,
  source_type TEXT NOT NULL,
  cursor_value TEXT,
  cursor_version BIGINT NOT NULL DEFAULT 1,
  last_seen_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS connector_cursors_unique_source
  ON connector_cursors (connector_account_id, source_ref, source_type);

-- connector_sync_jobs
CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  source_ref TEXT,
  source_type TEXT,
  trigger_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at BIGINT,
  completed_at BIGINT,
  next_run_at BIGINT,
  records_read BIGINT NOT NULL DEFAULT 0,
  records_written BIGINT NOT NULL DEFAULT 0,
  documents_indexed BIGINT NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_sync_jobs_org_status
  ON connector_sync_jobs (organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS connector_sync_jobs_connector_status
  ON connector_sync_jobs (connector_account_id, status, updated_at DESC);

-- connector_failures
CREATE TABLE IF NOT EXISTS connector_failures (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  sync_job_id TEXT REFERENCES connector_sync_jobs(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS connector_failures_org_created
  ON connector_failures (organization_id, created_at DESC);

-- raw_connector_records
CREATE TABLE IF NOT EXISTS raw_connector_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  source_updated_at BIGINT,
  captured_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS raw_connector_records_unique
  ON raw_connector_records (connector_account_id, source_type, external_id);

-- knowledge_sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  external_source_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  sync_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_sources_org_type
  ON knowledge_sources (organization_id, source_type, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sources_unique_connector_source
  ON knowledge_sources (organization_id, connector_account_id, source_type)
  WHERE connector_account_id IS NOT NULL;

-- knowledge_documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  knowledge_source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  external_document_id TEXT,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT,
  access_scope TEXT NOT NULL DEFAULT 'org',
  source_updated_at BIGINT,
  latest_version_id TEXT,
  fingerprint TEXT,
  redaction_status TEXT NOT NULL DEFAULT 'clean',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_documents_org_source
  ON knowledge_documents (organization_id, knowledge_source_id, updated_at DESC);

-- knowledge_document_versions
CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  version_label TEXT,
  source_version TEXT,
  content_markdown TEXT,
  content_text TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  sync_cursor TEXT,
  source_updated_at BIGINT,
  ingest_status TEXT NOT NULL,
  ingested_at BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_document_versions_fingerprint
  ON knowledge_document_versions (document_id, fingerprint);
CREATE INDEX IF NOT EXISTS knowledge_document_versions_org_document
  ON knowledge_document_versions (organization_id, document_id, updated_at DESC);

-- knowledge_chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  document_version_id TEXT NOT NULL REFERENCES knowledge_document_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_version_index
  ON knowledge_chunks (document_version_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_org_version
  ON knowledge_chunks (organization_id, document_version_id);

-- knowledge_embeddings
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
  document_version_id TEXT REFERENCES knowledge_document_versions(id) ON DELETE CASCADE,
  knowledge_chunk_id TEXT REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  attachment_id TEXT,
  scope_type TEXT NOT NULL,
  thread_id TEXT,
  message_id TEXT,
  user_id TEXT,
  owner_org_id TEXT,
  workspace_id TEXT,
  access_scope TEXT NOT NULL DEFAULT 'user',
  access_group_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding vector NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_embeddings_org_scope
  ON knowledge_embeddings (organization_id, scope_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_embeddings_attachment_lookup
  ON knowledge_embeddings (attachment_id, scope_type, user_id, owner_org_id);
CREATE INDEX IF NOT EXISTS knowledge_embeddings_thread_lookup
  ON knowledge_embeddings (thread_id, user_id, scope_type);
CREATE INDEX IF NOT EXISTS knowledge_embeddings_doc_lookup
  ON knowledge_embeddings (document_version_id, knowledge_chunk_id);

-- crm_contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  external_contact_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lifecycle_stage TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_unique_external
  ON crm_contacts (organization_id, connector_account_id, external_contact_id);

-- crm_companies
CREATE TABLE IF NOT EXISTS crm_companies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  external_company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_companies_unique_external
  ON crm_companies (organization_id, connector_account_id, external_company_id);

-- crm_deals
CREATE TABLE IF NOT EXISTS crm_deals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  external_deal_id TEXT NOT NULL,
  company_id TEXT REFERENCES crm_companies(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_name TEXT NOT NULL,
  stage TEXT,
  amount NUMERIC(18, 2),
  currency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_deals_unique_external
  ON crm_deals (organization_id, connector_account_id, external_deal_id);

-- crm_activities
CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  external_activity_id TEXT NOT NULL,
  contact_id TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_id TEXT REFERENCES crm_deals(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  summary TEXT,
  occurred_at BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_activities_unique_external
  ON crm_activities (organization_id, connector_account_id, external_activity_id);

-- agent_templates
CREATE TABLE IF NOT EXISTS agent_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_templates_org_key
  ON agent_templates (organization_id, template_key);

-- agent_instances
CREATE TABLE IF NOT EXISTS agent_instances (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_template_id TEXT REFERENCES agent_templates(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  active_version_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_instances_org_status
  ON agent_instances (organization_id, status, updated_at DESC);

-- agent_versions
CREATE TABLE IF NOT EXISTS agent_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  retrieval_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_versions_instance_label
  ON agent_versions (agent_instance_id, version_label);

-- agent_policies
CREATE TABLE IF NOT EXISTS agent_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  approval_mode TEXT NOT NULL,
  autonomy_mode TEXT NOT NULL,
  connector_write_policy TEXT NOT NULL DEFAULT 'approval_required',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_policies_instance
  ON agent_policies (agent_instance_id);

-- tool_policies
CREATE TABLE IF NOT EXISTS tool_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL,
  access_mode TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tool_policies_instance_tool
  ON tool_policies (agent_instance_id, tool_key);

-- agent_runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  requested_by_user_id TEXT,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  completed_at BIGINT
);
CREATE INDEX IF NOT EXISTS agent_runs_instance_status
  ON agent_runs (agent_instance_id, status, updated_at DESC);

-- run_steps
CREATE TABLE IF NOT EXISTS run_steps (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS run_steps_run
  ON run_steps (agent_run_id, created_at);

-- tool_calls
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  run_step_id TEXT REFERENCES run_steps(id) ON DELETE SET NULL,
  tool_key TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS tool_calls_run
  ON tool_calls (agent_run_id, created_at DESC);

-- approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT REFERENCES agent_instances(id) ON DELETE SET NULL,
  agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  tool_call_id TEXT REFERENCES tool_calls(id) ON DELETE SET NULL,
  requested_by_user_id TEXT,
  approval_type TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  decided_by_user_id TEXT,
  decision_reason TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  decided_at BIGINT
);
CREATE INDEX IF NOT EXISTS approval_requests_org_status
  ON approval_requests (organization_id, status, updated_at DESC);

-- action_executions
CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE SET NULL,
  agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  connector_account_id TEXT REFERENCES connector_accounts(id) ON DELETE SET NULL,
  execution_type TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS action_executions_org_status
  ON action_executions (organization_id, status, updated_at DESC);

-- evaluation_datasets
CREATE TABLE IF NOT EXISTS evaluation_datasets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  sample_count BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS evaluation_datasets_org_updated
  ON evaluation_datasets (organization_id, updated_at DESC);

-- evaluation_runs
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  candidate_variant_id TEXT,
  evaluation_dataset_id TEXT REFERENCES evaluation_datasets(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  score_quality NUMERIC(8, 4),
  score_safety NUMERIC(8, 4),
  score_latency NUMERIC(8, 4),
  score_approval_acceptance NUMERIC(8, 4),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  completed_at BIGINT
);
CREATE INDEX IF NOT EXISTS evaluation_runs_instance_status
  ON evaluation_runs (agent_instance_id, status, updated_at DESC);

-- candidate_variants
CREATE TABLE IF NOT EXISTS candidate_variants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  parent_version_id TEXT REFERENCES agent_versions(id) ON DELETE SET NULL,
  variant_label TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  retrieval_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  score_quality NUMERIC(8, 4),
  score_safety NUMERIC(8, 4),
  score_latency NUMERIC(8, 4),
  score_approval_acceptance NUMERIC(8, 4),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS candidate_variants_instance_status
  ON candidate_variants (agent_instance_id, status, updated_at DESC);

-- champion_variants
CREATE TABLE IF NOT EXISTS champion_variants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  candidate_variant_id TEXT REFERENCES candidate_variants(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  promoted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS champion_variants_instance
  ON champion_variants (agent_instance_id);

-- promotion_events
CREATE TABLE IF NOT EXISTS promotion_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
  candidate_variant_id TEXT REFERENCES candidate_variants(id) ON DELETE SET NULL,
  promoted_by_user_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS promotion_events_instance_created
  ON promotion_events (agent_instance_id, created_at DESC);

-- google_picker_accounts
CREATE TABLE IF NOT EXISTS google_picker_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  encrypted_tokens JSONB NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  last_used_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS google_picker_accounts_org_user
  ON google_picker_accounts (organization_id, user_id);

-- google_picker_selections
CREATE TABLE IF NOT EXISTS google_picker_selections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  google_picker_account_id TEXT NOT NULL REFERENCES google_picker_accounts(id) ON DELETE CASCADE,
  attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  source_url TEXT,
  fingerprint TEXT,
  status TEXT NOT NULL,
  queued_at BIGINT NOT NULL,
  completed_at BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS google_picker_selections_org_updated
  ON google_picker_selections (organization_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS google_picker_selections_org_file
  ON google_picker_selections (organization_id, drive_file_id);

-- local_listener_registrations
CREATE TABLE IF NOT EXISTS local_listener_registrations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  endpoint_url TEXT,
  platform TEXT,
  runtime_mode TEXT,
  tunnel_provider TEXT,
  supported_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_target TEXT,
  system_prompt_template TEXT,
  listener_secret_hash TEXT NOT NULL,
  encrypted_listener_secret JSONB NOT NULL,
  last_seen_at BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS local_listener_registrations_org_label
  ON local_listener_registrations (organization_id, label);
CREATE UNIQUE INDEX IF NOT EXISTS local_listener_registrations_secret_hash
  ON local_listener_registrations (listener_secret_hash);

-- local_handoffs
CREATE TABLE IF NOT EXISTS local_handoffs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  listener_registration_id TEXT NOT NULL REFERENCES local_listener_registrations(id) ON DELETE CASCADE,
  thread_id TEXT,
  requested_by_user_id TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  handoff_markdown TEXT NOT NULL,
  remote_delivery_id TEXT,
  delivered_at BIGINT,
  completed_at BIGINT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS local_handoffs_org_updated
  ON local_handoffs (organization_id, updated_at DESC);

-- handoff_artifacts
CREATE TABLE IF NOT EXISTS handoff_artifacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  local_handoff_id TEXT NOT NULL REFERENCES local_handoffs(id) ON DELETE CASCADE,
  attachment_id TEXT REFERENCES attachments(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  repo_url TEXT,
  repo_branch TEXT,
  repo_commit_sha TEXT,
  content_markdown TEXT,
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS handoff_artifacts_handoff_updated
  ON handoff_artifacts (local_handoff_id, updated_at DESC);
