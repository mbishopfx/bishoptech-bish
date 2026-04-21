-- Dedupe and harden connector-backed knowledge sources.
--
-- Background:
-- `knowledge_sources` is seeded when connector accounts are created and is also
-- ensured during worker ingestion. Prior to this migration there was no unique
-- constraint, so repeated seeding could create duplicate rows for the same
-- connector + source type pair. Those duplicates show up in scheduler joins
-- and can cause non-deterministic behavior when selecting a default source.
--
-- This migration:
-- 1) Removes duplicates (keeping the most recently updated row).
-- 2) Adds a partial unique index to prevent future duplicates for connector-
--    backed sources (connector_account_id IS NOT NULL).

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, connector_account_id, source_type
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM knowledge_sources
  WHERE connector_account_id IS NOT NULL
)
DELETE FROM knowledge_sources ks
USING ranked r
WHERE ks.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sources_unique_connector_source
  ON knowledge_sources (organization_id, connector_account_id, source_type)
  WHERE connector_account_id IS NOT NULL;

