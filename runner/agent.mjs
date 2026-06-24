import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadArtifactCatalog } from "./src/artifacts.mjs";

const agentPath = fileURLToPath(import.meta.url);
const runnerRoot = resolve(dirname(agentPath), "..");

export function validateAgentConfig(input, configDir = runnerRoot) {
  const required = ["platform", "products", "stateDir", "reportDir", "runnerId", "deviceId"];
  for (const key of required) {
    if (typeof input[key] !== "string" || !input[key].trim()) {
      throw new Error(`invalid_agent_config_${key}`);
    }
  }
  const usesArtifactCatalog = typeof input.artifactCatalog === "string" && input.artifactCatalog.trim();
  if (!usesArtifactCatalog && (
    typeof input.apk !== "string" || !input.apk.trim() ||
    typeof input.manifest !== "string" || !input.manifest.trim()
  )) {
    throw new Error("invalid_agent_config_artifacts");
  }
  const platform = new URL(input.platform);
  if (platform.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(platform.hostname)) {
    throw new Error("agent_platform_requires_https");
  }
  const safeId = /^[A-Za-z0-9._:-]{1,80}$/;
  if (!safeId.test(input.runnerId) || !safeId.test(input.deviceId)) {
    throw new Error("invalid_agent_identity");
  }
  const pollSeconds = boundedNumber(input.pollSeconds, 10, 1, 3600, "invalid_agent_poll_seconds");
  const errorBackoffSeconds = boundedNumber(input.errorBackoffSeconds, 30, 1, 3600, "invalid_agent_backoff_seconds");
  const heartbeatSeconds = boundedNumber(input.heartbeatSeconds, 15, 5, 120, "invalid_agent_heartbeat_seconds");
  return {
    platform: platform.toString(),
    apk: usesArtifactCatalog ? null : resolve(configDir, input.apk),
    products: resolve(configDir, input.products),
    manifest: usesArtifactCatalog ? null : resolve(configDir, input.manifest),
    artifactCatalog: usesArtifactCatalog ? resolve(configDir, input.artifactCatalog) : null,
    stateDir: resolve(configDir, input.stateDir),
    reportDir: resolve(configDir, input.reportDir),
    runnerId: input.runnerId,
    deviceId: input.deviceId,
    inspectionMode: input.inspectionMode || "production",
    aaptPath: input.aaptPath ? resolve(configDir, input.aaptPath) : null,
    pollSeconds,
    errorBackoffSeconds,
    heartbeatSeconds,
  };
}

export async function checkAgentReadiness(config, accessPath = access, loadCatalog = loadArtifactCatalog) {
  const requiredFiles = {
    products: config.products,
    ...(config.artifactCatalog
      ? { artifactCatalog: config.artifactCatalog }
      : { apk: config.apk, manifest: config.manifest }),
    ...(config.aaptPath ? { aaptPath: config.aaptPath } : {}),
  };
  for (const [key, path] of Object.entries(requiredFiles)) {
    try {
      await accessPath(path);
    } catch {
      throw new Error(`agent_missing_file:${key}`);
    }
  }
  let productIds = ["maxxed-remote"];
  if (config.artifactCatalog) {
    const catalog = await loadCatalog(config.artifactCatalog);
    productIds = Object.keys(catalog.products);
    for (const [productId, artifact] of Object.entries(catalog.products)) {
      for (const [kind, path] of Object.entries(artifact)) {
        try {
          await accessPath(path);
        } catch {
          throw new Error(`agent_missing_artifact:${productId}:${kind}`);
        }
      }
    }
  }
  return {
    runnerId: config.runnerId,
    deviceId: config.deviceId,
    productIds,
    checkedFiles: Object.keys(requiredFiles),
  };
}

function boundedNumber(value, fallback, minimum, maximum, code) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(code);
  return parsed;
}

export function buildRemoteCliArgs(config) {
  const values = {
    platform: config.platform,
    products: config.products,
    ...(config.artifactCatalog
      ? { artifacts: config.artifactCatalog }
      : { apk: config.apk, manifest: config.manifest }),
    stateDir: config.stateDir,
    reportDir: config.reportDir,
    runnerId: config.runnerId,
    deviceId: config.deviceId,
    inspectionMode: config.inspectionMode,
    heartbeatSeconds: config.heartbeatSeconds,
    ...(config.aaptPath ? { aaptPath: config.aaptPath } : {}),
  };
  return Object.entries(values).map(([key, value]) => `--${key}=${value}`);
}

export async function runAgent({ cycle, sleep = wait, signal, pollMs, errorBackoffMs, maxCycles = Infinity }) {
  let cycles = 0;
  while (!signal?.aborted && cycles < maxCycles) {
    let succeeded = false;
    try {
      const exitCode = await cycle();
      succeeded = exitCode === 0;
    } catch {
      succeeded = false;
    }
    cycles += 1;
    if (signal?.aborted || cycles >= maxCycles) break;
    await sleep(succeeded ? pollMs : errorBackoffMs, signal);
  }
  return { cycles, stopped: Boolean(signal?.aborted) };
}

function wait(milliseconds, signal) {
  return new Promise((resolvePromise) => {
    const timeout = setTimeout(resolvePromise, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolvePromise();
    }, { once: true });
  });
}

function executeCycle(config, signal) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(runnerRoot, "runner", "remote-cli.mjs"), ...buildRemoteCliArgs(config)], {
      cwd: runnerRoot,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: "inherit",
    });
    const abort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", abort, { once: true });
    child.once("error", reject);
    child.once("exit", (code) => {
      signal?.removeEventListener("abort", abort);
      resolvePromise(code ?? 1);
    });
  });
}

async function main() {
  const configArg = process.argv.slice(2).find((entry) => entry.startsWith("--config="));
  if (!configArg) throw new Error("Usage: node runner/agent.mjs --config=PATH [--check]");
  if (!process.env.MAXXED_RUNNER_API_TOKEN || process.env.MAXXED_RUNNER_API_TOKEN.length < 32) {
    throw new Error("MAXXED_RUNNER_API_TOKEN must be supplied through secret management.");
  }
  const configPath = resolve(configArg.slice("--config=".length));
  const config = validateAgentConfig(JSON.parse(await readFile(configPath, "utf8")), dirname(configPath));
  const readiness = await checkAgentReadiness(config);
  if (process.argv.includes("--check")) {
    console.log(JSON.stringify({ event: "runner_agent_ready", ...readiness }));
    return;
  }
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  console.log(JSON.stringify({
    event: "runner_agent_started",
    runnerId: config.runnerId,
    deviceId: config.deviceId,
    pollSeconds: config.pollSeconds,
  }));
  await runAgent({
    cycle: () => executeCycle(config, controller.signal),
    signal: controller.signal,
    pollMs: config.pollSeconds * 1000,
    errorBackoffMs: config.errorBackoffSeconds * 1000,
  });
  console.log(JSON.stringify({ event: "runner_agent_stopped" }));
}

if (process.argv[1] && resolve(process.argv[1]) === agentPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
