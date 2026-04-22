CREATE TABLE IF NOT EXISTS org_plugin_entitlements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  entitlement_status TEXT NOT NULL,
  entitlement_source TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_plugin_entitlements_org_plugin
  ON org_plugin_entitlements (organization_id, plugin_key);

CREATE TABLE IF NOT EXISTS org_plugin_installations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  activation_status TEXT NOT NULL,
  nav_visible BOOLEAN NOT NULL DEFAULT false,
  activated_at BIGINT,
  activated_by_user_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_plugin_installations_org_plugin
  ON org_plugin_installations (organization_id, plugin_key);

CREATE TABLE IF NOT EXISTS org_integration_credentials (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  credential_label TEXT,
  linked_account_name TEXT,
  linked_account_external_id TEXT,
  encrypted_config JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_integration_credentials_org_provider
  ON org_integration_credentials (organization_id, provider_key);

CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  linked_ticket_id TEXT,
  active_huddle_room_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_org_updated
  ON project (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_member (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  access_role TEXT NOT NULL,
  added_by_user_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS project_member_project_user
  ON project_member (project_id, user_id);
CREATE INDEX IF NOT EXISTS project_member_org_user
  ON project_member (organization_id, user_id);

CREATE TABLE IF NOT EXISTS project_column (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS project_column_project_position
  ON project_column (project_id, position);

CREATE TABLE IF NOT EXISTS project_card (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES project_column(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  created_by_user_id TEXT NOT NULL,
  assignee_user_id TEXT,
  ticket_id TEXT,
  due_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_card_project_column_position
  ON project_card (project_id, column_id, position);

CREATE TABLE IF NOT EXISTS project_artifact (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_key TEXT,
  content_type TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_artifact_project_updated
  ON project_artifact (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_note (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_note_project_updated
  ON project_note (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  approved_project_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ticket_org_updated
  ON ticket (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket_member (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  access_role TEXT NOT NULL,
  added_by_user_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_member_ticket_user
  ON ticket_member (ticket_id, user_id);

CREATE TABLE IF NOT EXISTS ticket_decision (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  decision_note TEXT,
  decided_by_user_id TEXT NOT NULL,
  project_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ticket_decision_ticket_created
  ON ticket_decision (ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_post (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  scheduled_for BIGINT,
  published_at BIGINT,
  created_by_user_id TEXT NOT NULL,
  error_message TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS social_post_org_updated
  ON social_post (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS social_publish_job (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  social_post_id TEXT NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  status TEXT NOT NULL,
  external_account_id TEXT,
  error_message TEXT,
  scheduled_for BIGINT,
  published_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS social_publish_job_post_updated
  ON social_publish_job (social_post_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_assistant_instance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  assistant_template_key TEXT NOT NULL,
  provider_mode TEXT NOT NULL,
  external_assistant_id TEXT,
  phone_number TEXT,
  caller_id TEXT,
  provisioning_status TEXT NOT NULL,
  last_synced_at BIGINT,
  created_by_user_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS voice_assistant_instance_org_template_mode
  ON voice_assistant_instance (organization_id, assistant_template_key, provider_mode);
CREATE INDEX IF NOT EXISTS voice_assistant_instance_org_updated
  ON voice_assistant_instance (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_campaign (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  assistant_instance_id TEXT REFERENCES voice_assistant_instance(id) ON DELETE SET NULL,
  assistant_template_key TEXT NOT NULL,
  provider_mode TEXT NOT NULL DEFAULT 'managed',
  external_assistant_id TEXT,
  phone_number TEXT,
  caller_id TEXT,
  provisioning_status TEXT NOT NULL DEFAULT 'awaiting_provisioning',
  last_synced_at BIGINT,
  created_by_user_id TEXT NOT NULL,
  csv_file_name TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS voice_campaign_org_updated
  ON voice_campaign (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_lead_batch (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES voice_campaign(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS voice_lead_batch_campaign_updated
  ON voice_lead_batch (campaign_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_lead (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES voice_lead_batch(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES voice_campaign(id) ON DELETE CASCADE,
  display_name TEXT,
  phone_number TEXT,
  email TEXT,
  company_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_index INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS voice_lead_campaign_row
  ON voice_lead (campaign_id, row_index);

CREATE TABLE IF NOT EXISTS voice_call_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES voice_campaign(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES voice_lead(id) ON DELETE CASCADE,
  external_call_id TEXT,
  status TEXT NOT NULL,
  transcript TEXT,
  error_message TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS voice_call_log_campaign_updated
  ON voice_call_log (campaign_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_transcript_summary (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  call_log_id TEXT NOT NULL REFERENCES voice_call_log(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS voice_transcript_summary_call_log
  ON voice_transcript_summary (call_log_id);

CREATE TABLE IF NOT EXISTS sms_campaign (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  message_template TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  csv_file_name TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sms_campaign_org_updated
  ON sms_campaign (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS sms_batch (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES sms_campaign(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sms_batch_campaign_updated
  ON sms_batch (campaign_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS sms_message_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES sms_campaign(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES sms_batch(id) ON DELETE CASCADE,
  phone_number TEXT,
  display_name TEXT,
  status TEXT NOT NULL,
  external_message_id TEXT,
  response_text TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sms_message_log_campaign_updated
  ON sms_message_log (campaign_id, updated_at DESC);
