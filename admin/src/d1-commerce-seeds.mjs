import { commerceGroups, commercePlans, commerceProducts, usageMeters } from './commerce.mjs';

function requireDb(db) {
  if (!db || typeof db.prepare !== 'function') throw new Error('D1 database binding with prepare() is required');
  return db;
}

function bind(stmt, params = []) {
  return stmt.bind(...params);
}

export function commerceSeedSummary({ groups = commerceGroups, products = commerceProducts, plans = commercePlans, meters = usageMeters } = {}) {
  return {
    groups: groups.length,
    products: products.length,
    plans: plans.length,
    meters: meters.length,
    supportEmailOk: products.every((product) => product.supportEmail === 'support@techmaxxed.com'),
    fieldStandaloneOk: products.filter((product) => product.group === 'field').every((product) => product.standalone === true && product.bundleEligible === false),
    businessUsagePlans: plans.filter((plan) => plan.billingModel === 'business_plus_seats_plus_usage').length
  };
}

export async function seedCommerceGroups(db, groups = commerceGroups) {
  requireDb(db);
  for (const group of groups) {
    await bind(db.prepare(`INSERT INTO commerce_groups (id,slug,name,buyer_type,purchase_mode,description,created_at,updated_at)
      VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, buyer_type=excluded.buyer_type, purchase_mode=excluded.purchase_mode, description=excluded.description, updated_at=CURRENT_TIMESTAMP`),
      [group.id, group.slug, group.name, group.buyerType, group.purchaseMode, group.description]
    ).run();
  }
  return { seeded: groups.length };
}

export async function seedCommerceProducts(db, products = commerceProducts) {
  requireDb(db);
  for (const product of products) {
    await bind(db.prepare(`INSERT INTO commerce_products (id,slug,name,group_slug,product_type,sales_status,demo_model,demo_limit,standalone,bundle_eligible,stripe_mode,support_email,checkout_state,entitlement_key,notes,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, group_slug=excluded.group_slug, product_type=excluded.product_type, sales_status=excluded.sales_status, demo_model=excluded.demo_model, demo_limit=excluded.demo_limit, standalone=excluded.standalone, bundle_eligible=excluded.bundle_eligible, stripe_mode=excluded.stripe_mode, support_email=excluded.support_email, checkout_state=excluded.checkout_state, entitlement_key=excluded.entitlement_key, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP`),
      [product.id, product.slug, product.name, product.group, product.productType, product.salesStatus, product.demoModel, product.demoLimit, product.standalone ? 1 : 0, product.bundleEligible ? 1 : 0, product.stripeMode, product.supportEmail, product.checkoutState, product.entitlementKey, product.notes]
    ).run();
  }
  return { seeded: products.length };
}

export async function seedCommercePlans(db, plans = commercePlans) {
  requireDb(db);
  for (const plan of plans) {
    await bind(db.prepare(`INSERT INTO commerce_plans (id,slug,name,group_slug,billing_model,monthly_usd,annual_usd,trial_days,included_seats,included_actions,included_storage_gb,extra_seat_usd,overage_unit,overage_usd,overage_policy,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, group_slug=excluded.group_slug, billing_model=excluded.billing_model, monthly_usd=excluded.monthly_usd, annual_usd=excluded.annual_usd, trial_days=excluded.trial_days, included_seats=excluded.included_seats, included_actions=excluded.included_actions, included_storage_gb=excluded.included_storage_gb, extra_seat_usd=excluded.extra_seat_usd, overage_unit=excluded.overage_unit, overage_usd=excluded.overage_usd, overage_policy=excluded.overage_policy, status=excluded.status, updated_at=CURRENT_TIMESTAMP`),
      [plan.id, plan.slug, plan.name, plan.group, plan.billingModel, plan.monthlyUsd, plan.annualUsd, plan.trialDays, plan.includedSeats, plan.includedActions, plan.includedStorageGb, plan.extraSeatUsd || null, plan.overageUnit || null, plan.overageUsd || null, plan.overagePolicy, 'active']
    ).run();
  }
  return { seeded: plans.length };
}

export async function seedUsageMeters(db, meters = usageMeters) {
  requireDb(db);
  for (const meter of meters) {
    await bind(db.prepare(`INSERT INTO usage_meters (id,meter_key,label,unit,warning_threshold,critical_threshold,status,created_at)
      VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(meter_key) DO UPDATE SET label=excluded.label, unit=excluded.unit, warning_threshold=excluded.warning_threshold, critical_threshold=excluded.critical_threshold, status=excluded.status`),
      [`meter_${meter.key}`, meter.key, meter.label, meter.unit, meter.warningThreshold, meter.criticalThreshold, 'active']
    ).run();
  }
  return { seeded: meters.length };
}

export async function seedCommerceCatalog(db) {
  const groups = await seedCommerceGroups(db);
  const products = await seedCommerceProducts(db);
  const plans = await seedCommercePlans(db);
  const meters = await seedUsageMeters(db);
  return {
    ok: true,
    seeded: {
      groups: groups.seeded,
      products: products.seeded,
      plans: plans.seeded,
      meters: meters.seeded
    },
    summary: commerceSeedSummary()
  };
}
