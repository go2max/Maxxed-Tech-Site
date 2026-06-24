import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { inspectApk } from "../src/inspector.mjs";
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
    inspectionMode: "test",
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

test("package mismatch, manifest traversal, absolute paths, and cross-product manifests fail closed", async () => {
  const dir = await tempDir();
  await assert.rejects(() => runSequentialJob({ ...baseOptions(dir), productsConfigPath: resolve("runner/config/products.example.json") }), /package_mismatch_or_unconfigured_product/);

  const traversalManifestPath = resolve(dir, "manifest.json");
  await writeFile(traversalManifestPath, JSON.stringify({
    app: "maxxed-remote",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [{ id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "../evil.mjs" }],
  }, null, 2));
  await assert.rejects(() => runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: traversalManifestPath, allowTestManifest: true }), /invalid_command_ref/);

  const crossProductManifestPath = resolve(dir, "cross.json");
  await writeFile(crossProductManifestPath, JSON.stringify({
    app: "rival-rush",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [{ id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/common/pass-step.mjs" }],
  }, null, 2));
  await assert.rejects(() => runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: crossProductManifestPath, allowTestManifest: true }), /cross_product_manifest_rejected/);

  await rm(dir, { recursive: true, force: true });
});

test("required-step failure stops the job and redacts secrets", async () => {
  const dir = await tempDir();
  const manifestPath = resolve(dir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    app: "maxxed-remote",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [
      { id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/common/fail-step.mjs" },
      { id: "launch-smoke", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/maxxed-remote/launch-smoke.mjs" },
    ],
  }, null, 2));
  const report = await runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: manifestPath, allowTestManifest: true });
  assert.equal(report.finalStatus, "fail");
  assert.equal(report.steps.length, 1);
  assert.match(report.steps[0].stderr, /redacted/);
  await rm(dir, { recursive: true, force: true });
});

test("timed out steps are hard-killed and reported as failures", async () => {
  const dir = await tempDir();
  const manifestPath = resolve(dir, "timeout.json");
  await writeFile(manifestPath, JSON.stringify({
    app: "maxxed-remote",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [
      { id: "artifact-verify", timeoutSeconds: 1, continueOnFailure: false, commandRef: "runner/scripts/common/timeout-step.mjs" },
    ],
  }, null, 2));
  const report = await runSequentialJob({
    ...baseOptions(dir),
    scriptPackManifestPath: manifestPath,
    allowTestManifest: true,
    stepIds: ["artifact-verify"],
  });
  assert.equal(report.finalStatus, "fail");
  assert.match(report.steps.at(-1).stderr, /step_timeout/);
  await rm(dir, { recursive: true, force: true });
});

test("lease contention and stale interrupted-job recovery are enforced", async () => {
  const dir = await tempDir();
  const slowManifestPath = resolve(dir, "slow-manifest.json");
  await writeFile(slowManifestPath, JSON.stringify({
    app: "maxxed-remote",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [
      { id: "artifact-verify", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/common/slow-step.mjs" },
      { id: "launch-smoke", timeoutSeconds: 2, continueOnFailure: false, commandRef: "runner/scripts/maxxed-remote/launch-smoke.mjs" },
    ],
  }, null, 2));
  const first = runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: slowManifestPath, allowTestManifest: true });
  await waitForActiveLease(dir);
  const second = await runSequentialJob({ ...baseOptions(dir), scriptPackManifestPath: slowManifestPath, allowTestManifest: true });
  assert.equal(second.finalStatus, "blocked");
  const activeAfterContention = JSON.parse(await readFile(resolve(dir, "runner-state.json"), "utf8"));
  assert.ok(activeAfterContention.activeJob);
  assert.notEqual(activeAfterContention.activeJob, second.jobId);
  await first;

  await writeFile(resolve(dir, "runner-state.json"), JSON.stringify({
    activeJob: "job-stale",
    deviceLease: { deviceId: "device-1", jobId: "job-stale", acquiredAt: new Date(0).toISOString(), expiresAt: new Date(0).toISOString() },
    runnerLease: { runnerId: "runner-1", jobId: "job-stale", acquiredAt: new Date(0).toISOString(), expiresAt: new Date(0).toISOString() },
    jobs: [{ jobId: "job-stale", runnerId: "runner-1", deviceId: "device-1", status: "running", startedAt: new Date(0).toISOString() }],
  }, null, 2));
  const recovered = await runSequentialJob(baseOptions(dir));
  assert.equal(recovered.finalStatus, "pass");
  const state = JSON.parse(await readFile(resolve(dir, "runner-state.json"), "utf8"));
  assert.equal(state.jobs.some((job) => job.jobId === "job-stale" && job.status === "interrupted"), true);
  await rm(dir, { recursive: true, force: true });
});

test("corrupted state recovers from backup and production inspection requires an Android SDK adapter", async () => {
  const dir = await tempDir();
  const report = await runSequentialJob(baseOptions(dir));
  assert.equal(report.finalStatus, "pass");
  await writeFile(resolve(dir, "runner-state.json"), "{ definitely not json");
  const recovered = await runSequentialJob(baseOptions(dir));
  assert.equal(recovered.finalStatus, "pass");

  await assert.rejects(() => inspectApk(resolve("runner/tests/fixtures/sample.apk"), {
    maxBytes: 1024 * 1024,
    mode: "production",
  }), /android_sdk_inspection_required/);

  await rm(dir, { recursive: true, force: true });
});
