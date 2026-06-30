import { readFile } from 'node:fs/promises';
import { commerceSeedSummary, seedCommerceCatalog } from './d1-commerce-seeds.mjs';

export async function commerceSeedTask({ db = null, dryRun = true, sqlPath = 'admin/db/commerce-seed.sql' } = {}) {
  const summary = commerceSeedSummary();
  const sql = await readFile(sqlPath, 'utf8');
  const validation = validateSeedSql(sql, summary);
  if (!validation.ok) return { ok: false, dryRun, summary, validation };
  if (dryRun || !db) {
    return {
      ok: true,
      dryRun: true,
      applied: false,
      summary,
      validation,
      note: dryRun ? 'Dry run only; no database writes attempted.' : 'No database binding supplied; no writes attempted.'
    };
  }
  const applied = await seedCommerceCatalog(db);
  return { ok: true, dryRun: false, applied: true, summary, validation, result: applied };
}

export function validateSeedSql(sql, expected = commerceSeedSummary()) {
  const checks = [
    { key: 'groups_block', ok: sql.includes('INSERT INTO commerce_groups'), message: 'Commerce groups seed block exists.' },
    { key: 'products_block', ok: sql.includes('INSERT INTO commerce_products'), message: 'Commerce products seed block exists.' },
    { key: 'plans_block', ok: sql.includes('INSERT INTO commerce_plans'), message: 'Commerce plans seed block exists.' },
    { key: 'meters_block', ok: sql.includes('INSERT INTO usage_meters'), message: 'Usage meters seed block exists.' },
    { key: 'support_email', ok: (sql.match(/support@techmaxxed\.com/g) || []).length === expected.products, message: 'Every commerce product uses the support mailbox.' },
    { key: 'field_standalone', ok: sql.includes("'maxxed-measure'") && sql.includes("'maxxed-gold-estimator'") && sql.includes("'fishing-maxxed'"), message: 'Field product seeds are present.' },
    { key: 'business_usage', ok: sql.includes('business_plus_seats_plus_usage'), message: 'Business usage billing plans are present.' },
    { key: 'storage_meter', ok: sql.includes("'storage_gb'"), message: 'Storage usage meter is present.' },
    { key: 'repeatable_upsert', ok: sql.includes('ON CONFLICT'), message: 'Seed SQL uses repeatable upserts.' }
  ];
  return { ok: checks.every((check) => check.ok), checks };
}
