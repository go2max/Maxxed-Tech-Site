import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const publicRoots = ['public', 'site'];
const manifest = JSON.parse(await readFile('admin/deploy/report-worker.json', 'utf8'));
const forbidden = [manifest.staticPath, manifest.route.replace('*', ''), new URL(manifest.staticPath, 'https://example.invalid').pathname];

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(html|js|css|json|md|txt)$/i.test(entry.name)) yield path;
  }
}

const violations = [];
for (const root of publicRoots) {
  for await (const file of walk(root)) {
    const content = await readFile(file, 'utf8');
    for (const target of forbidden) {
      if (target && content.includes(target)) violations.push(`${file} contains a private admin target`);
    }
  }
}

assert.deepEqual(violations, []);
console.log('public admin link guard tests passed');
