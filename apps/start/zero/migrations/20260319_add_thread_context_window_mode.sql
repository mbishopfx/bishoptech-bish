ALTER TABLE threads
ADD COLUMN IF NOT EXISTS context_window_mode TEXT NOT NULL DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS threads_context_window_mode
  ON threads (context_window_mode);
