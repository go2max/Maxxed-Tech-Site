import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { productSeedsFromPublicCatalog } from './catalog.mjs';

const now = new Date().toISOString();
const products = productSeedsFromPublicCatalog();

const integrations = [
  ['cloudflare_access', 'Cloudflare Access', ['ADMIN_HOSTNAME']],
  ['cloudflare_d1', 'Cloudflare D1', ['ADMIN_D1_BINDING']],
  ['cloudflare_r2_evidence', 'Cloudflare R2 evidence storage', ['ADMIN_R2_EVIDENCE_BUCKET']],
  ['google_play_developer_api', 'Google Play Developer API', ['ADMIN_GOOGLE_PLAY_PROJECT_ID']],
  ['google_play_reporting_api', 'Google Play Developer Reporting API', ['ADMIN_GOOGLE_PLAY_PROJECT_ID']],
  ['google_workspace_groups', 'Google Workspace / Groups', ['ADMIN_GOOGLE_WORKSPACE_CUSTOMER_ID']],
  ['mailbox_domain_health', 'Mailbox/domain health', ['ADMIN_SUPPORT_MAILBOX','ADMIN_BETA_MAILBOX','ADMIN_PRIVACY_MAILBOX']],
  ['android_runner_fleet', 'Android runner fleet', ['ADMIN_RUNNER_REGISTRY']],
  ['github_actions', 'GitHub Actions', []],
  ['uptime_monitoring', 'Uptime monitoring', []]
].map(([key, label, env]) => ({
  id: `int_${key}`,
  integrationKey: key,
  label,
  state: env.length ? 'not_configured' : 'insufficient_data',
  lastSyncAt: null,
  lastError: null,
  credentialSourceName: null,
  requiredEnv: env,
  notes: 'Integration placeholder. Configure hosted secrets and least-privilege service identities before enabling live sync.',
  updatedAt: now
}));

const readinessGateNames = [
  ['public_site_validation', 'Public site validation'],
  ['privacy_policy_present', 'Privacy policy present'],
  ['play_listing_url_present', 'Play listing URL present'],
  ['signed_release_artifact_recorded', 'Signed release artifact recorded'],
  ['signing_fingerprint_verified', 'Signing fingerprint verified'],
  ['debuggable_false', 'Debuggable false'],
  ['permissions_reviewed', 'Manifest permissions reviewed'],
  ['store_copy_reviewed', 'Store copy reviewed'],
  ['data_safety_reviewed', 'Data safety reviewed'],
  ['beta_feedback_reviewed', 'Beta feedback reviewed'],
  ['support_path_verified', 'Support path verified'],
  ['known_blockers_closed', 'Known blockers closed'],
  ['crash_anr_data_reviewed', 'Crash/ANR data reviewed when configured']
];

const readinessGates = products.flatMap((product) => readinessGateNames.map(([key, name]) => ({
  id: `gate_${product.slug}_${key}`,
  productId: product.id,
  gateKey: key,
  gateName: name,
  state: key === 'public_site_validation' ? 'not_run' : 'not_configured',
  mandatory: true,
  evidenceUrl: null,
  notes: key === 'crash_anr_data_reviewed' ? 'Requires Play Developer Reporting API configuration.' : '',
  updatedAt: now
})));

const monitoringChecks = [
  { id: 'mon_public_home', checkKey: 'public_home', label: 'techmaxxed.com public home', targetUrl: 'https://techmaxxed.com/', expectedMarker: 'Maxxed Technical Systems', sourceStatus: 'not_configured' },
  { id: 'mon_public_apps', checkKey: 'public_apps', label: 'Public apps directory', targetUrl: 'https://techmaxxed.com/apps/', expectedMarker: 'Android apps and software', sourceStatus: 'not_configured' },
  { id: 'mon_public_privacy', checkKey: 'public_privacy', label: 'Public privacy page', targetUrl: 'https://techmaxxed.com/privacy/', expectedMarker: 'Privacy', sourceStatus: 'not_configured' },
  { id: 'mon_support_mailbox', checkKey: 'support_mailbox', label: 'support@ mailbox health', targetUrl: null, expectedMarker: null, sourceStatus: 'not_configured' },
  { id: 'mon_beta_mailbox', checkKey: 'beta_mailbox', label: 'beta@ mailbox health', targetUrl: null, expectedMarker: null, sourceStatus: 'not_configured' }
];

const state = {
  generatedAt: now,
  products,
  betaApplications: [],
  betaStatusEvents: [],
  testerEnrollments: [],
  releaseRecords: [],
  supportCases: [],
  knownIssues: [],
  monitoringChecks,
  readinessGates,
  integrations,
  auditEvents: []
};

await mkdir(resolve('admin/data'), { recursive: true });
await writeFile(resolve('admin/data/admin-seed.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
console.log(`Seeded ${products.length} products and ${readinessGates.length} readiness gates into admin/data/admin-seed.json`);
