-- Adds organization and thread-level tool policy columns required by the
-- unified provider tool policy implementation.

ALTER TABLE threads
ADD COLUMN IF NOT EXISTS disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS provider_native_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS external_tools_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE org_ai_policy
ADD COLUMN IF NOT EXISTS disabled_tool_keys JSONB NOT NULL DEFAULT '[]'::jsonb;
