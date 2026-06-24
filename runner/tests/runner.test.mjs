import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { runSequentialJob } from "../src/runner.mjs";

async function tempDir() {
  return mkdtemp(resolve(tmpdir(), "maxxed-runner-"));
}

async function waitForActiveLease(dir) {
  const path = resolve(dir, "runner-state.json");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const state = JSON.parse(await readFile(path, "utf8"));
      if (state.activeJob) return;
    } catch {
      // ignore until the state file exists
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  }
  throw new Error("lease_not_acquired_in_time");
}

function baseOptions(dir) {
  return {
    rootDir: resolve("."),
    stateDir: dir,
    reportDir: resolve(dir, "reports"),
    runnerId: "runner-1",
    deviceId: "device-1",
    apkPath: resolve("runner/tests/fixtures/sample.apk"),
    productsConfigPath: resolve("runner/tests/fixtures/products.test.json"),
    scriptPackManifestPath: resolve("runner/config/script-packs/maxxed-remote/manifest.json"),
    stepIds: ["artifact-verify", "launch-smoke"],
  };
}

test("local dry run completes sequentially and writes deterministic reports", async () => {
  const dir = await tempDir();
  const report = await runSequentialJob(baseOptions(dir));
  assert.equal(report.finalStatus, "pass");
  assert.deepEqual(report.steps.map((step) => step.stepId), ["artifact-verify", "launch-smoke"]);
  const jsonReport = JSON.parse(await readFile(resolve(dir, "reports", `${report.jobId}.json`), "utf8"));
  assert.equal(jsonReport.sha256, report.sha256);
  await rm(dir, { recursive: true, force: true });
});

test("package mismatch and allowlist violations fail closed", async () => {
  const dir = await tempDir();
  await assert.rejects(() => runSequentialJob({ ...baseOptions(dir), productsConfigPath: resolve("runner/config/products.example.json") }), /package_mismatch_or_unconfigured_product/);
  await assert.rejects(() => runSequentialJob({ ...baseOptions(dir), stepIds: ["not-allowlisted"] }), /step_not_allowlisted/);
  await rm(dir, { recursive: true, force: true });
});

test("required-step failure stops the job and redacts secrets", async () => {
  const dir = await tempDir();
  const manifestPath = resolve(dir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ app: "maxxed-remote", steps: [
    { id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/common/fail-step.mjs" },
    { id: "launch-smoke", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/maxxed-remote/launch-smoke.mjs" }
  ] }, null, 2));
  const report = await runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: manifestPath });
  assert.equal(report.finalStatus, "fail");
  assert.equal(report.steps.length, 1);
  assert.match(report.steps[0].stderr, /redacted/);
  await rm(dir, { recursive: true, force: true });
});

test("lease contention blocks concurrent jobs", async () => {
  const dir = await tempDir();
  const slowManifestPath = resolve(dir, "slow-manifest.json");
  await writeFile(slowManifestPath, JSON.stringify({ app: "maxxed-remote", steps: [
    { id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/common/slow-step.mjs" },
    { id: "launch-smoke", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/maxxed-remote/launch-smoke.mjs" }
  ] }, null, 2));
  const first = runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: slowManifestPath });
  await waitForActiveLease(dir);
  await assert.rejects(() => runSequentialJob(baseOptions(dir)), /lease_contention/);
  await first;
  await rm(dir, { recursive: true, force: true });
});
