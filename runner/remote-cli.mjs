import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadArtifactCatalog, selectArtifact } from "./src/artifacts.mjs";
import { runHeartbeatLoop } from "./src/control-loop.mjs";
import { runSequentialJob } from "./src/runner.mjs";

const cliPath = fileURLToPath(import.meta.url);

export function parseArgs(entries) {
  return Object.fromEntries(entries.map((entry) => {
    const separator = entry.indexOf("=");
    if (!entry.startsWith("--") || separator < 3) throw new Error("invalid_runner_argument");
    return [entry.slice(2, separator), entry.slice(separator + 1)];
  }));
}

function validateConnection(args, token) {
  const required = ["platform", "products", "stateDir", "reportDir", "runnerId", "deviceId"];
  if (required.some((key) => !args[key]) || (!args.artifacts && (!args.apk || !args.manifest))) {
    throw new Error("Usage: node runner/remote-cli.mjs --platform=URL --products=PATH --stateDir=PATH --reportDir=PATH --runnerId=ID --deviceId=ID (--artifacts=PATH | --apk=PATH --manifest=PATH)");
  }
  if (!token || token.length < 32) {
    throw new Error("MAXXED_RUNNER_API_TOKEN must contain at least 32 characters.");
  }
  const platformUrl = new URL(args.platform);
  if (platformUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(platformUrl.hostname)) {
    throw new Error("The runner control API requires HTTPS outside local development.");
  }
  const heartbeatSeconds = Number(args.heartbeatSeconds || 15);
  if (!Number.isFinite(heartbeatSeconds) || heartbeatSeconds < 5 || heartbeatSeconds > 120) {
    throw new Error("invalid_heartbeat_seconds");
  }
  const localLeaseSeconds = Number(args.localLeaseSeconds || 3600);
  if (!Number.isFinite(localLeaseSeconds) || localLeaseSeconds < 300 || localLeaseSeconds > 14400) {
    throw new Error("invalid_local_lease_seconds");
  }
  return {
    platformUrl,
    heartbeatMs: heartbeatSeconds * 1000,
    localLeaseMs: localLeaseSeconds * 1000,
  };
}

async function resolveArtifacts(args) {
  if (args.artifacts) return loadArtifactCatalog(args.artifacts);
  return {
    products: {
      "maxxed-remote": {
        apk: resolve(args.apk),
        manifest: resolve(args.manifest),
      },
    },
  };
}

export async function runRemoteCycle({
  args,
  token,
  fetchImpl = fetch,
  runJob = runSequentialJob,
  heartbeatLoop = runHeartbeatLoop,
}) {
  const { platformUrl, heartbeatMs, localLeaseMs } = validateConnection(args, token);
  const artifacts = await resolveArtifacts(args);
  const productIds = Object.keys(artifacts.products);

  async function post(path, body, { allowNotFound = false } = {}) {
    const response = await fetchImpl(new URL(path, platformUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (response.status === 404 && allowNotFound) return null;
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `runner_api_${response.status}`);
    return payload.record;
  }

  const claimed = await post("/runner/jobs/claim", {
    runnerId: args.runnerId,
    deviceId: args.deviceId,
    productIds,
  }, { allowNotFound: true });
  if (!claimed) return { status: "idle", message: "No matching queued job." };

  const artifact = selectArtifact(artifacts, claimed.product_id);
  const orderedSteps = JSON.parse(claimed.ordered_steps_json);
  if (!Array.isArray(orderedSteps) || orderedSteps.length === 0) throw new Error("invalid_claimed_steps");

  const jobController = new AbortController();
  const heartbeatStop = new AbortController();
  let progress = { stepId: "starting", completedSteps: 0 };
  let cancellationReason = null;
  const heartbeatPromise = heartbeatLoop({
    intervalMs: heartbeatMs,
    stopSignal: heartbeatStop.signal,
    heartbeat: () => post(`/runner/jobs/${encodeURIComponent(claimed.id)}/heartbeat`, {
      runnerId: args.runnerId,
      progress,
    }),
    cancel: (reason) => {
      cancellationReason = reason;
      jobController.abort();
    },
  });

  let report;
  try {
    report = await runJob({
      rootDir: resolve("."),
      apkPath: artifact.apk,
      productsConfigPath: resolve(args.products),
      scriptPackManifestPath: artifact.manifest,
      stateDir: resolve(args.stateDir),
      reportDir: resolve(args.reportDir),
      runnerId: args.runnerId,
      deviceId: args.deviceId,
      stepIds: orderedSteps,
      inspectionMode: args.inspectionMode || "production",
      aaptPath: args.aaptPath,
      leaseDurationMs: localLeaseMs,
      signal: jobController.signal,
      onStepStart: (next) => {
        progress = next;
      },
    });
  } catch (error) {
    heartbeatStop.abort();
    await heartbeatPromise;
    await post(`/runner/jobs/${encodeURIComponent(claimed.id)}/complete`, {
      runnerId: args.runnerId,
      status: "interrupted",
      result: { error: error.message },
      evidence: [],
    });
    throw error;
  }

  heartbeatStop.abort();
  await heartbeatPromise;
  const status = {
    pass: "completed",
    fail: "failed",
    blocked: "blocked",
    interrupted: "interrupted",
    cancelled: "cancelled",
  }[report.finalStatus] || "failed";

  const result = {
    localJobId: report.jobId,
    product: report.product,
    packageName: report.packageName,
    sha256: report.sha256,
    finalStatus: report.finalStatus,
    ...(cancellationReason ? { cancellationReason } : {}),
    steps: report.steps.map((step) => ({
      stepId: step.stepId,
      status: step.status,
      exitCode: step.exitCode ?? null,
    })),
  };
  const evidence = report.steps.flatMap((step) =>
    (step.evidence || []).map((item) => ({
      stepId: step.stepId,
      type: String(item.type || "unknown").slice(0, 40),
      ref: String(item.ref || "").slice(0, 240),
    }))
  ).slice(0, 100);

  const completed = await post(`/runner/jobs/${encodeURIComponent(claimed.id)}/complete`, {
    runnerId: args.runnerId,
    status,
    result,
    evidence,
  });
  return {
    status: completed.lease_state,
    platformJobId: completed.id,
    localJobId: report.jobId,
  };
}

async function main() {
  const result = await runRemoteCycle({
    args: parseArgs(process.argv.slice(2)),
    token: process.env.MAXXED_RUNNER_API_TOKEN,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === cliPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
