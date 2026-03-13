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
