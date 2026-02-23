-- Adds per-thread reasoning preference used by runtime model resolution.
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS reasoning_effort TEXT;

CREATE INDEX IF NOT EXISTS threads_reasoning_effort
  ON threads (reasoning_effort);
