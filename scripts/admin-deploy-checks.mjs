import { spawnSync } from 'node:child_process';

const checks = [
  'admin/tests/report-deploy-manifest.test.mjs',
  'admin/tests/report-worker.test.mjs',
  'admin/tests/admin-report-page.test.mjs',
  'admin/tests/seed-report.test.mjs',
  'admin/tests/admin-deploy-checklist.test.mjs',
  'admin/tests/public-admin-link-guard.test.mjs'
];

let failed = false;
for (const file of checks) {
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

if (failed) {
  console.error('admin deploy checks failed');
  process.exitCode = 1;
} else {
  console.log('admin deploy checks passed');
}
