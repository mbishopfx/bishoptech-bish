CREATE TABLE IF NOT EXISTS playbook (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS playbook_org_updated
  ON playbook (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS playbook_step (
  id TEXT PRIMARY KEY,
  playbook_id TEXT NOT NULL REFERENCES playbook(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS playbook_step_playbook_position
  ON playbook_step (playbook_id, position);
CREATE INDEX IF NOT EXISTS playbook_step_org_playbook
  ON playbook_step (organization_id, playbook_id);
