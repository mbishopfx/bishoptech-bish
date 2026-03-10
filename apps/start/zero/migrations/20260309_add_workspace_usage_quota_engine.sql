CREATE TABLE IF NOT EXISTS usage_policy_template (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  seat_window_duration_ms BIGINT NOT NULL,
  target_margin_ratio_bps INTEGER NOT NULL,
  monthly_overage_ratio_bps INTEGER NOT NULL,
  average_sessions_per_seat_per_month INTEGER NOT NULL,
  reserve_headroom_ratio_bps INTEGER NOT NULL,
  min_reserve_nano_usd BIGINT NOT NULL,
  max_reserve_nano_usd BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS usage_policy_template_plan_feature
  ON usage_policy_template (plan_id, feature_key);

CREATE TABLE IF NOT EXISTS org_usage_policy_override (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  seat_window_duration_ms BIGINT,
  target_margin_ratio_bps INTEGER,
  monthly_overage_ratio_bps INTEGER,
  average_sessions_per_seat_per_month INTEGER,
  reserve_headroom_ratio_bps INTEGER,
  min_reserve_nano_usd BIGINT,
  max_reserve_nano_usd BIGINT,
  enabled BOOLEAN,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_usage_policy_override_org_feature
  ON org_usage_policy_override (organization_id, feature_key);

CREATE TABLE IF NOT EXISTS org_seat_slot (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  org_subscription_id TEXT,
  plan_id TEXT NOT NULL,
  cycle_start_at BIGINT NOT NULL,
  cycle_end_at BIGINT NOT NULL,
  seat_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  current_assignee_user_id TEXT,
  first_assigned_at BIGINT,
  last_assigned_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_slot_unique_cycle_index
  ON org_seat_slot (organization_id, cycle_start_at, cycle_end_at, seat_index);
CREATE INDEX IF NOT EXISTS org_seat_slot_org_assignee
  ON org_seat_slot (organization_id, current_assignee_user_id);

CREATE TABLE IF NOT EXISTS org_seat_slot_assignment (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cycle_start_at BIGINT NOT NULL,
  cycle_end_at BIGINT NOT NULL,
  assignment_status TEXT NOT NULL,
  assigned_at BIGINT NOT NULL,
  released_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_seat_slot_assignment_org_user
  ON org_seat_slot_assignment (organization_id, user_id, cycle_start_at);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_slot_assignment_active_slot
  ON org_seat_slot_assignment (seat_slot_id)
  WHERE assignment_status = 'active';

CREATE TABLE IF NOT EXISTS org_seat_bucket_balance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  bucket_type TEXT NOT NULL,
  total_nano_usd BIGINT NOT NULL,
  remaining_nano_usd BIGINT NOT NULL,
  current_window_started_at BIGINT,
  current_window_ends_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_seat_bucket_balance_slot_bucket
  ON org_seat_bucket_balance (seat_slot_id, bucket_type);

CREATE TABLE IF NOT EXISTS org_seat_bucket_ledger (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  bucket_balance_id TEXT NOT NULL,
  reservation_id TEXT,
  monetization_event_id TEXT,
  entry_type TEXT NOT NULL,
  amount_nano_usd BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_seat_bucket_ledger_bucket_balance
  ON org_seat_bucket_ledger (bucket_balance_id, created_at);

CREATE TABLE IF NOT EXISTS org_usage_reservation (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_nano_usd BIGINT NOT NULL,
  reserved_nano_usd BIGINT NOT NULL,
  released_nano_usd BIGINT NOT NULL DEFAULT 0,
  allocation JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_code TEXT,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_usage_reservation_org_status
  ON org_usage_reservation (organization_id, status, expires_at);

CREATE TABLE IF NOT EXISTS org_usage_event (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT,
  assistant_message_id TEXT,
  model_id TEXT NOT NULL,
  used_byok BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_nano_usd BIGINT,
  actual_nano_usd BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_usage_event_org_created_at
  ON org_usage_event (organization_id, created_at);

CREATE TABLE IF NOT EXISTS org_monetization_event (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seat_slot_id TEXT,
  usage_event_id TEXT,
  reservation_id TEXT,
  estimated_nano_usd BIGINT NOT NULL,
  actual_nano_usd BIGINT NOT NULL,
  captured_nano_usd BIGINT NOT NULL DEFAULT 0,
  refunded_nano_usd BIGINT NOT NULL DEFAULT 0,
  forgiven_nano_usd BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS org_monetization_event_org_status
  ON org_monetization_event (organization_id, status, updated_at);

CREATE TABLE IF NOT EXISTS chat_request_rate_limit_window (
  user_id TEXT NOT NULL,
  window_started_at BIGINT NOT NULL,
  hits INTEGER NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, window_started_at)
);
