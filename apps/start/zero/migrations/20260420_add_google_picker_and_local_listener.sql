ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_lane TEXT;

ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_label TEXT;

ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_source_ref TEXT;

ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS org_knowledge_metadata JSONB;

CREATE INDEX IF NOT EXISTS attachments_org_knowledge_source_lookup
  ON attachments (owner_org_id, org_knowledge_source_lane, org_knowledge_source_ref, updated_at DESC);

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
