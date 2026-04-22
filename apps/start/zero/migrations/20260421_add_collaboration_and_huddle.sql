CREATE TABLE IF NOT EXISTS thread_member_state (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_role TEXT NOT NULL DEFAULT 'participant',
  visibility TEXT NOT NULL DEFAULT 'visible',
  added_by_user_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS thread_member_state_thread_user_unique
  ON thread_member_state (thread_id, user_id);

CREATE INDEX IF NOT EXISTS thread_member_state_user_visibility_updated
  ON thread_member_state (user_id, visibility, updated_at DESC);

CREATE INDEX IF NOT EXISTS thread_member_state_org_idx
  ON thread_member_state (organization_id);

CREATE INDEX IF NOT EXISTS thread_member_state_thread_idx
  ON thread_member_state (thread_id);

ALTER TABLE threads
ADD COLUMN IF NOT EXISTS model_switch_pending BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE threads
ADD COLUMN IF NOT EXISTS last_model_switch_at BIGINT;

ALTER TABLE threads
ADD COLUMN IF NOT EXISTS last_model_switch_from TEXT;

CREATE INDEX IF NOT EXISTS threads_model_switch_pending
  ON threads (model_switch_pending);

INSERT INTO thread_member_state (
  id,
  thread_id,
  organization_id,
  user_id,
  access_role,
  visibility,
  added_by_user_id,
  created_at,
  updated_at
)
SELECT
  CONCAT('thread_member_', thread_id, '_', user_id),
  thread_id,
  COALESCE(owner_org_id, ''),
  user_id,
  'owner',
  COALESCE(visibility, 'visible'),
  user_id,
  created_at,
  updated_at
FROM threads
ON CONFLICT (thread_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS huddle_room (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  thread_id TEXT,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS huddle_room_room_id_unique
  ON huddle_room (room_id);

CREATE INDEX IF NOT EXISTS huddle_room_org_status_updated
  ON huddle_room (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS huddle_room_thread_idx
  ON huddle_room (thread_id);

CREATE TABLE IF NOT EXISTS huddle_member (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'member',
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS huddle_member_room_user_unique
  ON huddle_member (room_id, user_id);

CREATE INDEX IF NOT EXISTS huddle_member_room_last_seen
  ON huddle_member (room_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS huddle_reaction (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS huddle_reaction_room_created
  ON huddle_reaction (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS huddle_note (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Sticky note',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS huddle_note_room_updated
  ON huddle_note (room_id, updated_at DESC);
