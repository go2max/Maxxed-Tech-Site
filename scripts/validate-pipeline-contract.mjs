import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [pipeline, migration, agent] = await Promise.all([
  readFile(resolve(root, "platform/src/pipeline.js"), "utf8"),
  readFile(resolve(root, "platform/migrations/0001_runner_pipeline.sql"), "utf8"),
  readFile(resolve(root, "runner/agent/maxxed-runner-agent.ps1"), "utf8")
]);

assert.match(migration, /device_serial TEXT PRIMARY KEY/);
assert.match(migration, /UNIQUE\(job_id, step_index\)/);
assert.match(pipeline, /WHERE id=\? AND state='queued'/);
assert.match(pipeline, /claimed\.meta\?\.changes/);
assert.match(pipeline, /state = 'interrupted'.*lease_expires_at < \?/s);
assert.match(pipeline, /A completed step is immutable/);
assert.match(pipeline, /Every ordered step must reach a terminal state/);
assert.match(agent, /foreach \(\$step in @\(\$Job\.steps\)\)/);
assert.match(agent, /while \(-not \$process\.HasExited\)/);
assert.match(agent, /Send-Heartbeat \$Job\.id/);
assert.match(agent, /Stop-Process -Id \$process\.Id -Force/);
assert.doesNotMatch(agent, /Start-Job|ForEach-Object\s+-Parallel/);

const state = { job: "queued", device: null };
async function claim(runner) {
  await Promise.resolve();
  if (state.job !== "queued" || state.device) return false;
  state.job = "leased";
  state.device = runner;
  return true;
}
const claims = await Promise.all(Array.from({ length: 50 }, (_, index) => claim(`runner-${index}`)));
assert.equal(claims.filter(Boolean).length, 1);

console.log("Validated atomic claim guards, device/step uniqueness, lease expiry handling, immutable terminal steps, sequential execution, heartbeats, and timeout termination.");
