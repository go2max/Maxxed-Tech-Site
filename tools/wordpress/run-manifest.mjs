#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestPath = process.argv[2] || 'wordpress/products.example.json';
const manifestFile = resolve(manifestPath);

if (!existsSync(manifestFile)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const products = Array.isArray(manifest.products) ? manifest.products : [];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = `wordpress/reports/manifest-run-${stamp}.md`;
mkdirSync(dirname(reportPath), { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function lastLines(text, count = 4) {
  return text.split('\n').filter(Boolean).slice(-count).join(' ');
}

const rows = products.map((product) => {
  const id = product.id || 'unknown';
  const name = product.name || id;
  const type = product.type || 'unknown';
  const source = product.source || '';
  const activate = Boolean(product.activate);

  if (!source || !existsSync(resolve(source))) {
    return {
      name,
      type,
      activate,
      status: 'skipped',
      notes: `Artifact missing: ${source || '(none)'}`,
    };
  }

  if (!['plugin', 'theme'].includes(type)) {
    return { name, type, activate, status: 'skipped', notes: `Unsupported type: ${type}` };
  }

  const args = ['tools/wordpress/install-artifact.mjs', type, source];
  if (activate) args.push('--activate');
  const result = run('node', args);
  return {
    name,
    type,
    activate,
    status: result.status === 0 ? 'passed' : 'failed',
    notes: lastLines(result.output),
  };
});

const report = [
  '# WordPress Manifest Run Report',
  '',
  `Manifest: ${manifestPath}`,
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Product | Type | Activate | Status | Notes |',
  '|---|---|---:|---|---|',
  ...rows.map((row) => `| ${row.name} | ${row.type} | ${row.activate ? 'yes' : 'no'} | ${row.status} | ${row.notes.replaceAll('|', '/')} |`),
  '',
].join('\n');

writeFileSync(reportPath, report);
console.log(reportPath);

if (rows.some((row) => row.status === 'failed')) {
  process.exit(1);
}
