#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const handlers = new Map([
  ["build-recipes/android/repo-audit", dryRun],
  ["build-recipes/android/implementation-plan", dryRun],
  ["build-recipes/android/qa-gate", dryRun],
  ["build-recipes/web-tool/scaffold-plan", dryRun],
  ["build-recipes/web-tool/static-app-build", dryRun],
  ["build-recipes/web-tool/qa-gate", dryRun],
  ["build-recipes/wordpress/plugin-plan", dryRun],
  ["build-recipes/wordpress/plugin-build", dryRun],
  ["build-recipes/wordpress/qa-gate", dryRun],
  ["build-recipes/review/scope-review", humanReview]
]);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--")) throw new Error(`Unexpected argument ${key}`);
  args.set(key.slice(2), value ?? "true");
}

const baseUrl = String(args.get("base-url") || "").replace(/\/+$/, "");
const runnerId = String(args.get("runner-id") || `build-runner-${process.env.HOSTNAME || "local"}`);
const token = String(args.get("token") || process.env.MAXXED_BUILD_RUNNER_TOKEN || process.env.MAXXED_RUNNER_TOKEN || "");
const once = args.get("once") !== "false";
const pollSeconds = Math.max(5, Math.min(Number(args.get("poll-seconds") || 15), 300));
const workDirectory = resolve(String(args.get("work-dir") || ".maxxed-build-runner"));

if (!baseUrl.startsWith("https://")) throw new Error("Pass --base-url with an https:// admin Worker URL.");
if (!token) throw new Error("Set MAXXED_BUILD_RUNNER_TOKEN or pass --token.");

function headers(extra = {}) {
  return { authorization: `Bearer ${token}`, ...extra };
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: headers(options.headers)
  });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function dryRun(run) {
  const step = run.step;
  const directory = resolve(workDirectory, run.id);
  await mkdir(directory, { recursive: true });
  const result = {
    mode: "dry-run",
    status: "blocked",
    productId: step.product_id,
    productName: step.product_name,
    commandRef: run.commandRef,
    message: "Trusted build runner resolved the commandRef but real Codex/GitHub execution is not enabled yet."
  };
  await writeFile(resolve(directory, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

async function humanReview(run) {
  const result = await dryRun(run);
  return { ...result, status: "blocked", message: "Human scope review is required before build execution." };
}

async function processLease() {
  const lease = await api("/api/build-runner/lease", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runnerId })
  });
  if (!lease) return false;
  const run = lease.run;
  const handler = handlers.get(run.commandRef);
  if (!handler) {
    await complete(run.id, "blocked", { error: `No local handler approved for ${run.commandRef}` });
    return true;
  }
  try {
    const result = await handler(run);
    await complete(run.id, result.status === "passed" ? "passed" : "blocked", result);
  } catch (error) {
    await complete(run.id, "failed", { error: error.message });
  }
  return true;
}

async function complete(runId, state, result) {
  return api(`/api/build-runner/runs/${runId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runnerId, state, result })
  });
}

do {
  const hadWork = await processLease();
  if (!hadWork && !once) await new Promise((resolveDelay) => setTimeout(resolveDelay, pollSeconds * 1000));
} while (!once);
