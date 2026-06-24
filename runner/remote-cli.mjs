import { resolve } from "node:path";

import { runSequentialJob } from "./src/runner.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const separator = entry.indexOf("=");
  return [entry.slice(0, separator).replace(/^--/, ""), entry.slice(separator + 1)];
}));

const required = ["platform", "apk", "products", "manifest", "stateDir", "reportDir", "runnerId", "deviceId"];
if (required.some((key) => !args[key])) {
  console.error("Usage: node runner/remote-cli.mjs --platform=URL --apk=PATH --products=PATH --manifest=PATH --stateDir=PATH --reportDir=PATH --runnerId=ID --deviceId=ID [--inspectionMode=production] [--aaptPath=PATH]");
  process.exit(1);
}

const token = process.env.MAXXED_RUNNER_API_TOKEN;
if (!token || token.length < 32) {
  console.error("MAXXED_RUNNER_API_TOKEN must contain at least 32 characters.");
  process.exit(1);
}

const platformUrl = new URL(args.platform);
if (platformUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(platformUrl.hostname)) {
  console.error("The runner control API requires HTTPS outside local development.");
  process.exit(1);
}

async function post(path, body) {
  const response = await fetch(new URL(path, platformUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status === 404) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `runner_api_${response.status}`);
  return payload.record;
}

const claimed = await post("/runner/jobs/claim", {
  runnerId: args.runnerId,
  deviceId: args.deviceId,
});

if (!claimed) {
  console.log(JSON.stringify({ status: "idle", message: "No matching queued job." }));
  process.exit(0);
}

const orderedSteps = JSON.parse(claimed.ordered_steps_json);
let report;
try {
  report = await runSequentialJob({
    rootDir: resolve("."),
    apkPath: resolve(args.apk),
    productsConfigPath: resolve(args.products),
    scriptPackManifestPath: resolve(args.manifest),
    stateDir: resolve(args.stateDir),
    reportDir: resolve(args.reportDir),
    runnerId: args.runnerId,
    deviceId: args.deviceId,
    stepIds: orderedSteps,
    inspectionMode: args.inspectionMode || "production",
    aaptPath: args.aaptPath,
  });
} catch (error) {
  await post(`/runner/jobs/${encodeURIComponent(claimed.id)}/complete`, {
    runnerId: args.runnerId,
    status: "interrupted",
    result: { error: error.message },
    evidence: [],
  });
  throw error;
}

const status = {
  pass: "completed",
  fail: "failed",
  blocked: "blocked",
  interrupted: "interrupted",
}[report.finalStatus] || "failed";

const result = {
  localJobId: report.jobId,
  product: report.product,
  packageName: report.packageName,
  sha256: report.sha256,
  finalStatus: report.finalStatus,
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

console.log(JSON.stringify({
  status: completed.lease_state,
  platformJobId: completed.id,
  localJobId: report.jobId,
}, null, 2));
