import { commerceSeedTask } from './commerce-seed-task.mjs';
import { commerceProducts, commercePlans, commerceGroups, usageMeters } from './commerce.mjs';

export async function buildSeedReport(options = {}) {
  const task = await commerceSeedTask({ dryRun: true, sqlPath: options.sqlPath || 'admin/db/commerce-seed.sql' });
  const productsByGroup = commerceProducts.reduce((counts, product) => {
    counts[product.group] = (counts[product.group] || 0) + 1;
    return counts;
  }, {});
  const plansByGroup = commercePlans.reduce((counts, plan) => {
    counts[plan.group] = (counts[plan.group] || 0) + 1;
    return counts;
  }, {});
  const blockers = [];
  if (!task.ok) blockers.push('seed_sql_validation_failed');
  if (!task.summary?.supportEmailOk) blockers.push('support_route_guard_failed');
  if (!task.summary?.fieldStandaloneOk) blockers.push('field_standalone_guard_failed');
  if ((task.summary?.businessUsagePlans || 0) < 1) blockers.push('business_usage_plan_missing');
  return {
    ok: blockers.length === 0,
    mode: 'read_only_dry_run',
    blockers,
    recommendation: blockers.length
      ? `Resolve ${blockers.join(', ')} before applying commerce seeds.`
      : 'Seed artifacts are ready for controlled D1 application after local checks pass.',
    counts: {
      groups: commerceGroups.length,
      products: commerceProducts.length,
      plans: commercePlans.length,
      meters: usageMeters.length,
      productsByGroup,
      plansByGroup
    },
    task
  };
}
