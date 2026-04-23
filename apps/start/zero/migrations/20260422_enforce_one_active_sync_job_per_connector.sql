-- Enforce at most one active (queued/running) connector sync job per connector.
--
-- Why:
-- - The scheduler uses `NOT EXISTS` guards, which can still race if multiple scheduler
--   instances are running (or if a manual trigger happens concurrently).
-- - Multiple queued jobs for the same connector add load and can produce confusing UX.
--
-- This migration:
-- 1) Dedupes `queued` jobs (keeps the oldest queued per connector).
-- 2) Resolves any duplicate `running` jobs (keeps the most-recently-started job).
-- 3) Adds a partial unique index to prevent future duplicates.

-- 1) Keep only the oldest queued job per connector.
DELETE FROM connector_sync_jobs
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY connector_account_id
        ORDER BY created_at ASC, id ASC
      ) AS row_number
    FROM connector_sync_jobs
    WHERE status = 'queued'
  ) ranked
  WHERE ranked.row_number > 1
);

-- 2) If multiple running jobs exist for a connector, fail all but the newest.
UPDATE connector_sync_jobs
SET status = 'failed',
    error_message = COALESCE(error_message, 'Duplicate running sync job superseded by newer run'),
    completed_at = COALESCE(completed_at, EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at = COALESCE(updated_at, EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY connector_account_id
        ORDER BY started_at DESC NULLS LAST, created_at DESC, id DESC
      ) AS row_number
    FROM connector_sync_jobs
    WHERE status = 'running'
  ) ranked
  WHERE ranked.row_number > 1
);

-- 3) Prevent duplicates moving forward.
CREATE UNIQUE INDEX IF NOT EXISTS connector_sync_jobs_one_active_per_connector
  ON connector_sync_jobs (connector_account_id)
  WHERE status IN ('queued', 'running');

