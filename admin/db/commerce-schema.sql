-- Maxxed commerce, entitlement, usage, and capacity schema draft.
-- Designed to sit beside the existing admin schema until D1 migration rollout.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commerce_groups (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  buyer_type TEXT NOT NULL,
  purchase_mode TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commerce_products (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  product_type TEXT NOT NULL,
  sales_status TEXT NOT NULL DEFAULT 'draft',
  demo_model TEXT NOT NULL DEFAULT 'none',
  demo_limit TEXT,
  standalone INTEGER NOT NULL DEFAULT 1,
  bundle_eligible INTEGER NOT NULL DEFAULT 0,
  stripe_mode TEXT NOT NULL DEFAULT 'subscription',
  support_email TEXT NOT NULL DEFAULT 'support@techmaxxed.com',
  checkout_state TEXT NOT NULL DEFAULT 'not_connected',
  entitlement_key TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commerce_plans (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  billing_model TEXT NOT NULL,
  monthly_usd REAL,
  annual_usd REAL,
  trial_days INTEGER NOT NULL DEFAULT 0,
  included_seats INTEGER NOT NULL DEFAULT 1,
  included_actions INTEGER NOT NULL DEFAULT 0,
  included_storage_gb REAL NOT NULL DEFAULT 0,
  extra_seat_usd REAL,
  overage_unit TEXT,
  overage_usd REAL,
  overage_policy TEXT NOT NULL DEFAULT 'upgrade_prompt',
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_product_access (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES commerce_plans(id),
  commerce_product_id TEXT NOT NULL REFERENCES commerce_products(id),
  access_level TEXT NOT NULL DEFAULT 'pro',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, commerce_product_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  stripe_customer_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_accounts (
  id TEXT PRIMARY KEY,
  owner_customer_id TEXT NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','restricted','suspended','closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_seats (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_accounts(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','removed','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, customer_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  business_id TEXT REFERENCES business_accounts(id),
  plan_id TEXT NOT NULL REFERENCES commerce_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly','annual','usage','custom')),
  state TEXT NOT NULL CHECK (state IN ('trialing','active','past_due','grace','restricted','canceled','expired','suspended')),
  trial_ends_at TEXT,
  current_period_ends_at TEXT,
  grace_ends_at TEXT,
  canceled_at TEXT,
  last_payment_failed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (customer_id IS NOT NULL OR business_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES subscriptions(id),
  customer_id TEXT REFERENCES customers(id),
  business_id TEXT REFERENCES business_accounts(id),
  commerce_product_id TEXT NOT NULL REFERENCES commerce_products(id),
  entitlement_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('trialing','active','past_due','grace','restricted','canceled','expired','suspended')),
  access_level TEXT NOT NULL DEFAULT 'pro',
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (customer_id IS NOT NULL OR business_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS usage_meters (
  id TEXT PRIMARY KEY,
  meter_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  warning_threshold REAL NOT NULL DEFAULT 0.7,
  critical_threshold REAL NOT NULL DEFAULT 0.85,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  meter_key TEXT NOT NULL REFERENCES usage_meters(meter_key),
  customer_id TEXT REFERENCES customers(id),
  business_id TEXT REFERENCES business_accounts(id),
  commerce_product_id TEXT REFERENCES commerce_products(id),
  quantity REAL NOT NULL DEFAULT 1,
  idempotency_key TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (customer_id IS NOT NULL OR business_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS capacity_limits (
  id TEXT PRIMARY KEY,
  limit_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  hard_limit REAL NOT NULL,
  warning_threshold REAL NOT NULL DEFAULT 0.7,
  critical_threshold REAL NOT NULL DEFAULT 0.85,
  emergency_threshold REAL NOT NULL DEFAULT 0.95,
  current_value REAL NOT NULL DEFAULT 0,
  projected_30_day_value REAL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warning','critical','emergency')),
  mitigation TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capacity_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disk_used_gb REAL NOT NULL,
  disk_total_gb REAL NOT NULL,
  database_gb REAL NOT NULL DEFAULT 0,
  upload_gb REAL NOT NULL DEFAULT 0,
  log_gb REAL NOT NULL DEFAULT 0,
  backup_gb REAL NOT NULL DEFAULT 0,
  promised_storage_gb REAL NOT NULL DEFAULT 0,
  promised_monthly_actions REAL NOT NULL DEFAULT 0,
  projected_30_day_disk_gb REAL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('ok','warning','critical','emergency')),
  recommendation TEXT
);
