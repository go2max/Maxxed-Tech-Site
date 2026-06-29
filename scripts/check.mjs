import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const commands = [
  ["node", ["./scripts/build.mjs"]],
  ["node", ["./scripts/validate-site.mjs"]],
  ["node", ["./scripts/validate-artifact.mjs"]],
  ["node", ["--test", "./tools/local-business-lead-scanner/tests/lead-scanner.test.mjs"]],
];

if (existsSync(resolve(root, "platform"))) {
  commands.push(["node", ["./scripts/check-platform.mjs"]]);
}

if (existsSync(resolve(root, "runner"))) {
  commands.push(["node", ["./scripts/check-runner.mjs"]]);
  commands.push(["node", ["./scripts/validate-testing-catalog.mjs"]]);
}

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
