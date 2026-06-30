export const commerceGroups = [
  {
    id: 'group_business',
    slug: 'business',
    name: 'Maxxed Business Tools',
    buyerType: 'business',
    purchaseMode: 'business_workspace',
    description: 'Business-facing request, ticket, client, quote, plugin, and admin tools with business, seat, and usage billing.'
  },
  {
    id: 'group_plugins',
    slug: 'plugins',
    name: 'Plugin Tools',
    buyerType: 'individual_or_business',
    purchaseMode: 'standalone_or_bundle',
    description: 'Individual plugins, small plugin bundles, and business-suite inclusions. Plugins are an acquisition channel, not a single forced suite.'
  },
  {
    id: 'group_field',
    slug: 'field',
    name: 'Field Tools',
    buyerType: 'individual',
    purchaseMode: 'standalone_first',
    description: 'Niche field apps stay individually purchasable first because each buyer segment is different.'
  },
  {
    id: 'group_career',
    slug: 'career',
    name: 'Career Tools',
    buyerType: 'individual',
    purchaseMode: 'standalone_or_bundle',
    description: 'Job search, tracking, clipper, resume, interview, and follow-up workflows.'
  },
  {
    id: 'group_utility',
    slug: 'utility',
    name: 'Everyday Utilities',
    buyerType: 'individual',
    purchaseMode: 'standalone_or_pass',
    description: 'Remote, compass, measure, cleanup, and practical device utilities.'
  }
];

export const commerceProducts = [
  {
    id: 'commerce_post_purge_pro',
    slug: 'post-purge-pro',
    name: 'Post Purge Pro',
    group: 'plugins',
    productType: 'wordpress_plugin',
    salesStatus: 'demo_ready',
    demoModel: 'usage_free',
    demoLimit: 'Preview 50 posts and export 1 CSV before upgrade.',
    standalone: true,
    bundleEligible: true,
    stripeMode: 'subscription',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'plugin.post_purge_pro',
    notes: 'Use as the first plugin commerce test because it has a clear value path: preview, export, confirm, trash-only cleanup.'
  },
  {
    id: 'commerce_job_tracker',
    slug: 'job-application-tracker',
    name: 'Job Application Tracker',
    group: 'career',
    productType: 'web_app_plus_extension',
    salesStatus: 'build_next',
    demoModel: 'usage_free',
    demoLimit: 'Track 10 applications or run 10 clipper saves before upgrade.',
    standalone: true,
    bundleEligible: true,
    stripeMode: 'subscription',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'career.job_tracker',
    notes: 'Best plugin/browser launch lane for fast market visibility and low storage risk.'
  },
  {
    id: 'commerce_business_requests',
    slug: 'business-request-hub',
    name: 'Business Request Hub',
    group: 'business',
    productType: 'business_saas',
    salesStatus: 'build_next',
    demoModel: 'trial',
    demoLimit: '14-day trial with 1 business, 1 seat, and limited requests.',
    standalone: true,
    bundleEligible: true,
    stripeMode: 'business_seat_usage',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'business.request_hub',
    notes: 'Internal support/contact/request workflow can become the first business SaaS billing test.'
  },
  {
    id: 'commerce_maxxed_measure',
    slug: 'maxxed-measure',
    name: 'Maxxed Measure',
    group: 'field',
    productType: 'android_app',
    salesStatus: 'demo_planned',
    demoModel: 'free_saved_projects',
    demoLimit: '3 saved measurements before Pro upgrade.',
    standalone: true,
    bundleEligible: false,
    stripeMode: 'subscription',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'field.maxxed_measure',
    notes: 'Field products remain individually purchasable first.'
  },
  {
    id: 'commerce_gold_estimator',
    slug: 'maxxed-gold-estimator',
    name: 'Maxxed Gold Estimator',
    group: 'field',
    productType: 'android_app',
    salesStatus: 'demo_planned',
    demoModel: 'usage_free',
    demoLimit: '3 saved estimates before Pro upgrade.',
    standalone: true,
    bundleEligible: false,
    stripeMode: 'subscription',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'field.gold_estimator',
    notes: 'Higher individual pricing because the buyer is niche and value-driven.'
  },
  {
    id: 'commerce_fishing_maxxed',
    slug: 'fishing-maxxed',
    name: 'Fishing Maxxed',
    group: 'field',
    productType: 'android_app',
    salesStatus: 'demo_planned',
    demoModel: 'free_saved_records',
    demoLimit: '5 catch records before Pro upgrade.',
    standalone: true,
    bundleEligible: false,
    stripeMode: 'subscription',
    supportEmail: 'support@techmaxxed.com',
    checkoutState: 'not_connected',
    entitlementKey: 'field.fishing_maxxed',
    notes: 'Individual first; bundle only after actual overlap is proven.'
  }
];

export const commercePlans = [
  {
    id: 'plan_plugin_starter',
    slug: 'plugin-starter',
    name: 'Individual Plugin Pro',
    group: 'plugins',
    billingModel: 'per_product_subscription',
    monthlyUsd: 4.99,
    annualUsd: 49.00,
    trialDays: 7,
    includedSeats: 1,
    includedActions: 250,
    includedStorageGb: 0.25,
    overagePolicy: 'upgrade_prompt',
    intendedFor: 'One plugin, one user, fast standalone purchases.'
  },
  {
    id: 'plan_plugin_bundle',
    slug: 'plugin-bundle',
    name: 'Plugin Bundle',
    group: 'plugins',
    billingModel: 'bundle_subscription',
    monthlyUsd: 9.99,
    annualUsd: 99.00,
    trialDays: 7,
    includedSeats: 1,
    includedActions: 1000,
    includedStorageGb: 1,
    overagePolicy: 'upgrade_prompt',
    intendedFor: 'Several related plugins without forcing a full suite.'
  },
  {
    id: 'plan_business_starter',
    slug: 'business-starter',
    name: 'Business Starter',
    group: 'business',
    billingModel: 'business_plus_seats_plus_usage',
    monthlyUsd: 19.00,
    annualUsd: 190.00,
    trialDays: 14,
    includedSeats: 1,
    includedActions: 100,
    includedStorageGb: 1,
    extraSeatUsd: 12.00,
    overageUnit: '1000 actions',
    overageUsd: 10.00,
    overagePolicy: 'metered_after_allowance',
    intendedFor: 'Solo business owner validating the workflow.'
  },
  {
    id: 'plan_business_pro',
    slug: 'business-pro',
    name: 'Business Pro',
    group: 'business',
    billingModel: 'business_plus_seats_plus_usage',
    monthlyUsd: 49.00,
    annualUsd: 490.00,
    trialDays: 14,
    includedSeats: 3,
    includedActions: 1000,
    includedStorageGb: 5,
    extraSeatUsd: 10.00,
    overageUnit: '1000 actions',
    overageUsd: 10.00,
    overagePolicy: 'metered_after_allowance',
    intendedFor: 'Default business plan with room for a small team.'
  },
  {
    id: 'plan_business_scale',
    slug: 'business-scale',
    name: 'Business Scale',
    group: 'business',
    billingModel: 'business_plus_seats_plus_usage',
    monthlyUsd: 99.00,
    annualUsd: 990.00,
    trialDays: 14,
    includedSeats: 10,
    includedActions: 5000,
    includedStorageGb: 20,
    extraSeatUsd: 8.00,
    overageUnit: '1000 actions',
    overageUsd: 8.00,
    overagePolicy: 'metered_after_allowance',
    intendedFor: 'Higher-volume business accounts before custom contracts.'
  },
  {
    id: 'plan_field_individual',
    slug: 'field-individual',
    name: 'Field Tool Individual',
    group: 'field',
    billingModel: 'per_product_subscription',
    monthlyUsd: 7.99,
    annualUsd: 79.00,
    trialDays: 7,
    includedSeats: 1,
    includedActions: 500,
    includedStorageGb: 1,
    overagePolicy: 'upgrade_prompt',
    intendedFor: 'Standalone niche field apps; no forced field suite at launch.'
  }
];

export const entitlementStates = ['trialing', 'active', 'past_due', 'grace', 'restricted', 'canceled', 'expired', 'suspended'];

export const usageMeters = [
  { key: 'actions', label: 'Product actions', unit: 'action', warningThreshold: 0.7, criticalThreshold: 0.85 },
  { key: 'storage_gb', label: 'Storage', unit: 'GB', warningThreshold: 0.7, criticalThreshold: 0.85 },
  { key: 'seats', label: 'Seats', unit: 'seat', warningThreshold: 0.8, criticalThreshold: 0.95 },
  { key: 'uploads', label: 'Uploads', unit: 'upload', warningThreshold: 0.7, criticalThreshold: 0.85 },
  { key: 'exports', label: 'Exports', unit: 'export', warningThreshold: 0.75, criticalThreshold: 0.9 }
];

export const capacitySnapshot = {
  serverDiskGb: 50,
  currentDiskUsedGb: 18,
  databaseGb: 1.2,
  uploadsGb: 6.5,
  logsGb: 2.3,
  backupGb: 5.1,
  projectedThirtyDayDiskGb: 34,
  objectStorageEnabled: false,
  activeSubscribers: 0,
  trialSubscribers: 0,
  promisedStorageGb: commercePlans.reduce((total, plan) => total + Number(plan.includedStorageGb || 0), 0),
  promisedMonthlyActions: commercePlans.reduce((total, plan) => total + Number(plan.includedActions || 0), 0)
};

export function riskLevel(value, warning = 0.7, critical = 0.85) {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'ok';
}

export function capacityRisk(snapshot = capacitySnapshot) {
  const diskRatio = snapshot.currentDiskUsedGb / snapshot.serverDiskGb;
  const projectedRatio = snapshot.projectedThirtyDayDiskGb / snapshot.serverDiskGb;
  const promisedRatio = snapshot.promisedStorageGb / snapshot.serverDiskGb;
  return {
    diskRatio,
    projectedRatio,
    promisedRatio,
    diskLevel: riskLevel(diskRatio),
    projectedLevel: riskLevel(projectedRatio),
    promisedLevel: riskLevel(promisedRatio, 0.5, 1),
    recommendation: promisedRatio >= 1
      ? 'Enable external object storage before approving high-storage business plans.'
      : projectedRatio >= 0.85
        ? 'Upgrade or route uploads before the projected 30-day disk use reaches emergency level.'
        : 'Capacity is acceptable for commerce setup, but keep monitoring before launch.'
  };
}
