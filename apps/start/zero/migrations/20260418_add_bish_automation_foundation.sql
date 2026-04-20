CREATE EXTENSION IF NOT EXISTS vector;

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
