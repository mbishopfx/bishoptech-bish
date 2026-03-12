CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS threads_user_org_visibility_updated
  ON threads (user_id, owner_org_id, visibility, updated_at DESC);

CREATE INDEX IF NOT EXISTS threads_title_search_fts
  ON threads
  USING GIN (to_tsvector('simple', COALESCE(title, '')));

CREATE INDEX IF NOT EXISTS threads_title_search_trgm
  ON threads
  USING GIN (LOWER(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS messages_content_search_fts
  ON messages
  USING GIN (to_tsvector('simple', COALESCE(content, '')));

CREATE INDEX IF NOT EXISTS messages_content_search_trgm
  ON messages
  USING GIN (LOWER(content) gin_trgm_ops)
  WHERE status = 'done' AND role IN ('user', 'assistant');

CREATE INDEX IF NOT EXISTS messages_user_created_desc
  ON messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_user_thread_search_scope
  ON messages (user_id, thread_id, created_at DESC)
  WHERE status = 'done' AND role IN ('user', 'assistant');
