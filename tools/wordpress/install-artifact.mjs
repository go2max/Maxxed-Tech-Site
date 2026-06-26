#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , type, source, ...flags] = process.argv;
const activate = flags.includes('--activate');
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.wordpress.yml';
const envFile = process.env.ENV_FILE || '.env.wordpress';

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

if (!['plugin', 'theme'].includes(type || '')) {
  fail('Usage: node tools/wordpress/install-artifact.mjs <plugin|theme> <zip-path> [--activate]', 2);
}

if (!source || !existsSync(resolve(source))) {
  fail(`Artifact not found: ${source || '(none)'}`, 2);
}

function run(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  });

  if ((result.status ?? 1) !== 0) {
    if (options.quiet) {
      const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
      if (output) console.error(output);
    }
    process.exit(result.status ?? 1);
  }

  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

const compose = ['compose', '-f', composeFile, '--env-file', envFile];
run([...compose, 'up', '-d', 'db', 'wordpress', 'phpmyadmin']);

const wpPath = `/workspace/${source.replaceAll('\\', '/')}`;
const installCommand = type === 'plugin' ? 'plugin' : 'theme';
const args = [...compose, 'run', '--rm', 'wpcli', installCommand, 'install', wpPath, '--force'];
if (activate) args.push('--activate');
run(args);

console.log(`Installed ${type} artifact: ${source}${activate ? ' (activated)' : ''}`);
