import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

for (const [command, args] of [
  ["node", ["./platform/tests/validate-platform.mjs"]],
  ["node", ["--test", "./platform/tests/app.test.mjs"]],
  ["node", ["--test", "./platform/tests/access.test.mjs"]],
  ["node", ["--test", "./platform/tests/backups.test.mjs"]],
  ["node", ["--test", "./platform/tests/knowledge-base.test.mjs"]],
  ["node", ["--test", "./platform/tests/persistence.test.mjs"]],
  ["node", ["--test", "./platform/tests/dashboard.test.mjs"]],
  ["node", ["--test", "./platform/tests/beta.test.mjs"]],
  ["node", ["--test", "./platform/tests/readiness.test.mjs"]],
  ["node", ["--test", "./platform/tests/security-monitoring.test.mjs"]],
  ["node", ["--test", "./platform/tests/evidence.test.mjs"]],
  ["node", ["--test", "./platform/tests/regression.test.mjs"]],
]) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
