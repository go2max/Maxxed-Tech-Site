import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const failures = [];

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

const siteFiles = await walk('site');
for (const file of siteFiles) {
  const rel = relative('.', file).split(sep).join('/');
  if (rel.startsWith('site/admin') || rel.includes('/admin/')) failures.push(`admin file emitted into public site: ${rel}`);
  if (/\.(html|js|css|json|txt|xml)$/.test(file)) {
    const text = await readFile(file, 'utf8');
    if (text.includes('ADMIN_ALLOW_MOCK_IDENTITY') || text.includes('Cf-Access-Jwt-Assertion')) failures.push(`public site references admin-only identity material: ${rel}`);
    if (text.includes('admin.techmaxxed.com') && !rel.endsWith('robots.txt')) failures.push(`public site references private admin hostname: ${rel}`);
  }
}

const adminBuildFiles = await walk('dist-admin');
const secretPatterns = [
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN PRIVATE KEY-----/,
  /ghp_[0-9A-Za-z]{20,}/,
  /sk-[0-9A-Za-z]{20,}/,
  /refresh_token/i
];
for (const file of adminBuildFiles) {
  if (!/\.(html|js|css|json|txt|xml)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) failures.push(`possible secret emitted in admin build: ${relative('.', file)}`);
  }
}

if (process.env.ADMIN_ENV === 'production' && process.env.ADMIN_ALLOW_MOCK_IDENTITY === 'true') {
  failures.push('ADMIN_ALLOW_MOCK_IDENTITY=true is forbidden in production');
}

if (failures.length) {
  console.error('Admin boundary validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Admin boundary validation passed');
