import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync('admin/deploy/local-validation-plan.json', 'utf8'));
let failed = false;

for (const command of plan.commands) {
  console.log(`\n$ ${command}`);
  const [program, ...args] = command.split(' ');
  const result = spawnSync(program, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  console.error('\nlocal validation plan failed');
  process.exitCode = 1;
} else {
  console.log('\nlocal validation plan passed');
}
