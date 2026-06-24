import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { inspectApk } from "../src/inspector.mjs";
import { runSequentialJob } from "../src/runner.mjs";
import { loadArtifactCatalog, selectArtifact } from "../src/artifacts.mjs";
import { loadScriptPackManifest } from "../src/catalog.mjs";
import { runHeartbeatLoop } from "../src/control-loop.mjs";
import { buildRemoteCliArgs, checkAgentReadiness, runAgent, validateAgentConfig } from "../agent.mjs";

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
    scriptPackManifestPath: resolve("runner/tests/fixtures/test-manifest.json"),
    stepIds: ["artifact-verify", "launch-smoke"],
    inspectionMode: "test",
    allowTestManifest: true,
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
  const mismatchProductsPath = resolve(dir, "mismatch-products.json");
  await writeFile(mismatchProductsPath, JSON.stringify({
    products: [{ slug: "other-app", packageId: "com.example.other" }],
  }));
  await assert.rejects(
    () => runSequentialJob({ ...baseOptions(dir), productsConfigPath: mismatchProductsPath }),
    /package_mismatch_or_unconfigured_product/
  );

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


test("agent configuration is bounded and requires HTTPS outside localhost", () => {
  assert.throws(() => validateAgentConfig({
    platform: "http://admin.techmaxxed.com",
    apk: "app.apk",
    products: "products.json",
    manifest: "manifest.json",
    stateDir: "state",
    reportDir: "reports",
    runnerId: "runner-1",
    deviceId: "device-1",
  }), /agent_platform_requires_https/);

  const config = validateAgentConfig({
    platform: "https://admin.techmaxxed.com",
    apk: "app.apk",
    products: "products.json",
    manifest: "manifest.json",
    stateDir: "state",
    reportDir: "reports",
    runnerId: "runner-1",
    deviceId: "device-1",
    pollSeconds: 5,
    errorBackoffSeconds: 15,
  }, resolve("."));

  assert.equal(config.pollSeconds, 5);
  assert.equal(config.errorBackoffSeconds, 15);
  assert.equal(buildRemoteCliArgs(config).some((value) => /token|secret|authorization/i.test(value)), false);
});

test("agent executes one cycle at a time and applies bounded backoff", async () => {
  let active = 0;
  let maximumActive = 0;
  let invocation = 0;
  const sleeps = [];
  const outcomes = [0, 1, 0];

  const result = await runAgent({
    maxCycles: outcomes.length,
    pollMs: 1000,
    errorBackoffMs: 5000,
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    cycle: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
      active -= 1;
      return outcomes[invocation++];
    },
  });

  assert.equal(result.cycles, 3);
  assert.equal(maximumActive, 1);
  assert.deepEqual(sleeps, [1000, 5000]);
});


test("agent readiness checks local dependencies without exposing credentials", async () => {
  const config = validateAgentConfig({
    platform: "https://admin.techmaxxed.com",
    apk: "app.apk",
    products: "products.json",
    manifest: "manifest.json",
    stateDir: "state",
    reportDir: "reports",
    runnerId: "runner-1",
    deviceId: "device-1",
    aaptPath: "aapt.exe",
  }, resolve("."));

  const checked = [];
  const readiness = await checkAgentReadiness(config, async (path) => checked.push(path));
  assert.deepEqual(readiness.checkedFiles, ["products", "apk", "manifest", "aaptPath"]);
  assert.equal(checked.length, 4);
  assert.doesNotMatch(JSON.stringify(readiness), /token|secret|authorization/i);

  await assert.rejects(
    () => checkAgentReadiness(config, async (path) => {
      if (path === config.manifest) throw new Error("missing");
    }),
    /agent_missing_file:manifest/
  );
});


test("all portfolio manifests are package-bound and use the real Android harness", async () => {
  const products = [
    ["maxxed-remote", "com.maxxedtechnicalsystems.maxxedremote"],
    ["maxxed-compass", "com.maxxed.compass"],
    ["maxxed-measure", "com.maxxed.measure"],
    ["maxxed-gold-estimator", "com.maxxed.goldestimator"],
    ["fishing-maxxed", "com.maxxed.fishingmaxxed"],
    ["rival-rush", "com.maxxed_technical_systems.rivalrushlaunch"],
  ];
  for (const [slug, packageId] of products) {
    const { manifest } = await loadScriptPackManifest({
      rootDir: resolve("."),
      product: { slug, packageId },
      requestedManifestPath: resolve(`runner/config/script-packs/${slug}/manifest.json`),
    });
    assert.equal(manifest.packageIds.includes(packageId), true);
    assert.equal(manifest.steps.some((step) =>
      step.id === "launch-smoke" && /android-app-smoke\.mjs$/.test(step.commandRef)
    ), true);
  }
});

test("artifact catalog resolves exact app artifacts and rejects unsupported claims", async () => {
  const dir = await tempDir();
  const path = resolve(dir, "artifacts.json");
  await writeFile(path, JSON.stringify({
    products: {
      "maxxed-compass": {
        apk: "./maxxed-compass.apk",
        manifest: "./maxxed-compass-manifest.json",
      },
      "rival-rush": {
        apk: "./rival-rush.apk",
        manifest: "./rival-rush-manifest.json",
      },
    },
  }));
  const catalog = await loadArtifactCatalog(path);
  assert.equal(selectArtifact(catalog, "maxxed-compass").apk, resolve(dir, "maxxed-compass.apk"));
  assert.throws(() => selectArtifact(catalog, "maxxed-remote"), /unsupported_claimed_product/);
  await rm(dir, { recursive: true, force: true });
});

test("heartbeat loop requests cooperative cancellation and fails closed after repeated loss", async () => {
  const stop = new AbortController();
  let cancellationReason = null;
  const cancelled = await runHeartbeatLoop({
    intervalMs: 1,
    stopSignal: stop.signal,
    heartbeat: async () => ({ lease_state: "cancelling" }),
    cancel: (reason) => {
      cancellationReason = reason;
    },
  });
  assert.equal(cancelled.beats, 1);
  assert.equal(cancellationReason, "server_cancellation_requested");

  let attempts = 0;
  cancellationReason = null;
  const failed = await runHeartbeatLoop({
    intervalMs: 1,
    stopSignal: new AbortController().signal,
    heartbeat: async () => {
      attempts += 1;
      throw new Error("network");
    },
    cancel: (reason) => {
      cancellationReason = reason;
    },
  });
  assert.equal(attempts, 3);
  assert.equal(failed.consecutiveFailures, 3);
  assert.equal(cancellationReason, "lease_heartbeat_failed");
});

test("active sequential step is killed and reported cancelled when its lease is cancelled", async () => {
  const dir = await tempDir();
  const manifestPath = resolve(dir, "cancel-manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    app: "maxxed-remote",
    packageIds: ["com.maxxedtechnicalsystems.maxxedremote"],
    steps: [
      { id: "artifact-verify", timeoutSeconds: 5, continueOnFailure: false, commandRef: "runner/scripts/common/slow-step.mjs" },
    ],
  }, null, 2));
  const controller = new AbortController();
  const running = runSequentialJob({
    ...baseOptions(dir),
    scriptPackManifestPath: manifestPath,
    allowTestManifest: true,
    stepIds: ["artifact-verify"],
    signal: controller.signal,
  });
  await waitForActiveLease(dir);
  controller.abort();
  const report = await running;
  assert.equal(report.finalStatus, "cancelled");
  assert.equal(report.steps.at(-1).status, "cancelled");
  await rm(dir, { recursive: true, force: true });
});

test("agent readiness validates every configured portfolio artifact", async () => {
  const config = validateAgentConfig({
    platform: "https://admin.techmaxxed.com",
    products: "products.json",
    artifactCatalog: "artifacts.json",
    stateDir: "state",
    reportDir: "reports",
    runnerId: "runner-1",
    deviceId: "device-1",
    heartbeatSeconds: 20,
  }, resolve("."));
  const checked = [];
  const readiness = await checkAgentReadiness(
    config,
    async (path) => checked.push(path),
    async () => ({
      products: {
        "maxxed-compass": { apk: resolve("compass.apk"), manifest: resolve("compass-manifest.json") },
        "rival-rush": { apk: resolve("rival.apk"), manifest: resolve("rival-manifest.json") },
      },
    }),
  );
  assert.deepEqual(readiness.productIds, ["maxxed-compass", "rival-rush"]);
  assert.equal(checked.length, 6);
  assert.equal(buildRemoteCliArgs(config).some((value) => value.startsWith("--artifacts=")), true);
  assert.equal(buildRemoteCliArgs(config).some((value) => value.startsWith("--heartbeatSeconds=20")), true);
  assert.equal(buildRemoteCliArgs(config).some((value) => value.startsWith("--localLeaseSeconds=3600")), true);
});
