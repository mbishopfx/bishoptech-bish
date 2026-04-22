ALTER TABLE huddle_member
ADD COLUMN IF NOT EXISTS session_id TEXT;

ALTER TABLE huddle_member
ADD COLUMN IF NOT EXISTS audio_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE huddle_member
ADD COLUMN IF NOT EXISTS is_speaking BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE huddle_member
ADD COLUMN IF NOT EXISTS audio_level DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE huddle_member
ADD COLUMN IF NOT EXISTS connection_state TEXT NOT NULL DEFAULT 'idle';

CREATE INDEX IF NOT EXISTS huddle_member_room_session_idx
  ON huddle_member (room_id, session_id);

CREATE TABLE IF NOT EXISTS huddle_signal (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  sender_session_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS huddle_signal_recipient_created_idx
  ON huddle_signal (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS huddle_signal_room_created_idx
  ON huddle_signal (room_id, created_at DESC);
