import { appById } from "./catalog.js";

const headers = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" };
const terminalSteps = new Set(["passed", "failed", "blocked", "manual-review", "interrupted"]);

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const now = () => new Date().toISOString();
const leaseUntil = () => new Date(Date.now() + 120_000).toISOString();

async function requestJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeFileName(value, fallback) {
  const cleaned = String(value || fallback).replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  return cleaned || fallback;
}

function requireBindings(env, includeR2 = false) {
  if (!env.DB || (includeR2 && !env.ARTIFACTS)) return json({ error: "The private testing service is not configured." }, 503);
  return null;
}

function validOrigin(request, url) {
  return request.headers.get("origin") === url.origin;
}

export async function listArtifacts(env) {
  const unavailable = requireBindings(env);
  if (unavailable) return unavailable;
  const result = await env.DB.prepare("SELECT id, app_id, file_name, sha256, byte_size, created_by, created_at FROM test_artifacts ORDER BY created_at DESC LIMIT 100").all();
  return json({ artifacts: result.results || [] });
}

export async function uploadArtifact(request, env, actor, url) {
  const unavailable = requireBindings(env, true);
  if (unavailable) return unavailable;
  if (!validOrigin(request, url)) return json({ error: "Invalid request origin." }, 403);
  const appId = request.headers.get("x-app-id");
  if (!appById.has(appId)) return json({ error: "Choose a recognized app." }, 400);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/vnd.android.package-archive") && !contentType.includes("application/octet-stream")) return json({ error: "Upload an APK file." }, 415);
  const bytes = await request.arrayBuffer();
  const maximum = Math.min(Number(env.MAX_APK_BYTES || 250_000_000), 250_000_000);
  if (bytes.byteLength < 4 || bytes.byteLength > maximum) return json({ error: "APK size is outside the allowed range." }, 413);
  const magic = new Uint8Array(bytes, 0, 4);
  if (magic[0] !== 0x50 || magic[1] !== 0x4b) return json({ error: "The uploaded file is not an APK/ZIP artifact." }, 400);
  const id = crypto.randomUUID();
  const fileName = safeFileName(request.headers.get("x-file-name"), `${appId}.apk`);
  if (!fileName.toLowerCase().endsWith(".apk")) return json({ error: "The artifact filename must end in .apk." }, 400);
  const hash = await sha256Hex(bytes);
  const objectKey = `apks/${appId}/${id}/${fileName}`;
  const createdAt = now();
  await env.ARTIFACTS.put(objectKey, bytes, { httpMetadata: { contentType: "application/vnd.android.package-archive" }, customMetadata: { sha256: hash, appId } });
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO test_artifacts (id, app_id, file_name, object_key, sha256, byte_size, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, appId, fileName, objectKey, hash, bytes.byteLength, actor, createdAt),
      env.DB.prepare("INSERT INTO audit_events (id, actor_email, action, target_type, target_id, details, created_at) VALUES (?, ?, 'test_artifact.uploaded', 'test_artifact', ?, ?, ?)").bind(crypto.randomUUID(), actor, id, JSON.stringify({ appId, fileName, sha256: hash, byteSize: bytes.byteLength }), createdAt)
    ]);
  } catch (error) {
    await env.ARTIFACTS.delete(objectKey);
    throw error;
  }
  return json({ artifact: { id, app_id: appId, file_name: fileName, sha256: hash, byte_size: bytes.byteLength, created_at: createdAt } }, 201);
}

export async function createJob(request, env, actor, url) {
  const unavailable = requireBindings(env);
  if (unavailable) return unavailable;
  if (!validOrigin(request, url)) return json({ error: "Invalid request origin." }, 403);
  const input = await requestJson(request);
  const app = appById.get(input?.appId);
  if (!app) return json({ error: "Unknown app." }, 400);
  const artifact = await env.DB.prepare("SELECT id, app_id FROM test_artifacts WHERE id = ?").bind(String(input?.artifactId || "")).first();
  if (!artifact || artifact.app_id !== app.id) return json({ error: "Choose an APK uploaded for this app." }, 400);
  const suite = input.suiteId ? app.suites?.[input.suiteId] : null;
  if (input.suiteId && !suite) return json({ error: "Unknown suite." }, 400);
  const selected = suite || (Array.isArray(input.scriptIds) ? input.scriptIds.map(String) : []);
  const scriptIds = [...new Set(selected)];
  const approved = new Set(app.scripts.filter((script) => script.commandRef).map((script) => script.id));
  if (!scriptIds.length || scriptIds.length > 25 || scriptIds.some((id) => !approved.has(id))) return json({ error: "Choose approved executable scripts for this app." }, 400);
  const id = crypto.randomUUID();
  const createdAt = now();
  const statements = [
    env.DB.prepare("INSERT INTO test_jobs (id, app_id, suite_id, script_ids, state, created_by, created_at, artifact_id, updated_at) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?)").bind(id, app.id, input.suiteId || null, JSON.stringify(scriptIds), actor, createdAt, artifact.id, createdAt),
    ...scriptIds.map((scriptId, index) => env.DB.prepare("INSERT INTO test_job_steps (id, job_id, step_index, script_id, state) VALUES (?, ?, ?, ?, 'queued')").bind(crypto.randomUUID(), id, index, scriptId)),
    env.DB.prepare("INSERT INTO audit_events (id, actor_email, action, target_type, target_id, details, created_at) VALUES (?, ?, 'test_job.queued', 'test_job', ?, ?, ?)").bind(crypto.randomUUID(), actor, id, JSON.stringify({ appId: app.id, artifactId: artifact.id, suiteId: input.suiteId || null, scriptIds }), createdAt)
  ];
  await env.DB.batch(statements);
  return json({ id, state: "queued", artifactId: artifact.id, scriptIds }, 201);
}

export async function listJobs(env) {
  const unavailable = requireBindings(env);
  if (unavailable) return unavailable;
  const result = await env.DB.prepare("SELECT j.id, j.app_id, j.state, j.script_ids, j.created_at, j.updated_at, j.leased_by, j.device_serial, j.result_summary, a.file_name, a.sha256 FROM test_jobs j LEFT JOIN test_artifacts a ON a.id = j.artifact_id ORDER BY j.created_at DESC LIMIT 50").all();
  const jobs = [];
  for (const row of result.results || []) {
    const steps = await env.DB.prepare("SELECT id, step_index, script_id, state, started_at, completed_at, exit_code, result_json FROM test_job_steps WHERE job_id = ? ORDER BY step_index").bind(row.id).all();
    const evidence = await env.DB.prepare("SELECT id, step_id, file_name, content_type, byte_size, sha256, created_at FROM test_evidence WHERE job_id = ? ORDER BY created_at").bind(row.id).all();
    jobs.push({ ...row, script_ids: JSON.parse(row.script_ids), steps: steps.results || [], evidence: evidence.results || [] });
  }
  return json({ jobs });
}

async function runnerAuthorized(request, env) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = String(env.RUNNER_TOKEN || "");
  if (!supplied || !expected) return false;
  const [left, right] = await Promise.all([sha256Hex(new TextEncoder().encode(supplied)), sha256Hex(new TextEncoder().encode(expected))]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

async function ownedJob(env, jobId, runnerId) {
  return env.DB.prepare("SELECT id, app_id, artifact_id, state, leased_by FROM test_jobs WHERE id = ? AND leased_by = ?").bind(jobId, runnerId).first();
}

async function leaseJob(request, env) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "").trim();
  const runnerName = String(input?.runnerName || runnerId).trim().slice(0, 80);
  const deviceSerial = String(input?.deviceSerial || "").trim().slice(0, 120);
  if (!/^[A-Za-z0-9._:-]{3,120}$/.test(runnerId) || !deviceSerial) return json({ error: "Valid runner and device identifiers are required." }, 400);
  const timestamp = now();
  await env.DB.prepare("UPDATE test_jobs SET state = 'interrupted', updated_at = ? WHERE state IN ('leased','running') AND lease_expires_at < ?").bind(timestamp, timestamp).run();
  await env.DB.prepare("DELETE FROM device_leases WHERE lease_expires_at < ?").bind(timestamp).run();
  const existing = await env.DB.prepare("SELECT id FROM test_jobs WHERE leased_by = ? AND state IN ('leased','running') ORDER BY created_at LIMIT 1").bind(runnerId).first();
  if (existing) return runnerJob(env, existing.id);
  const deviceLease = await env.DB.prepare("SELECT runner_id FROM device_leases WHERE device_serial = ? AND lease_expires_at >= ?").bind(deviceSerial, timestamp).first();
  if (deviceLease && deviceLease.runner_id !== runnerId) return new Response(null, { status: 204 });
  const candidate = await env.DB.prepare("SELECT id FROM test_jobs WHERE state = 'queued' ORDER BY created_at LIMIT 1").first();
  await env.DB.prepare("INSERT INTO runner_agents (id, name, device_serial, state, current_job_id, last_seen_at) VALUES (?, ?, ?, 'idle', NULL, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, device_serial=excluded.device_serial, last_seen_at=excluded.last_seen_at").bind(runnerId, runnerName, deviceSerial, timestamp).run();
  if (!candidate) return new Response(null, { status: 204 });
  const expires = leaseUntil();
  const claimed = await env.DB.prepare("UPDATE test_jobs SET state='leased', leased_by=?, device_serial=?, lease_expires_at=?, updated_at=? WHERE id=? AND state='queued'").bind(runnerId, deviceSerial, expires, timestamp, candidate.id).run();
  if (!claimed.meta?.changes) return new Response(null, { status: 204 });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO device_leases (device_serial, runner_id, job_id, lease_expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(device_serial) DO UPDATE SET runner_id=excluded.runner_id, job_id=excluded.job_id, lease_expires_at=excluded.lease_expires_at").bind(deviceSerial, runnerId, candidate.id, expires),
    env.DB.prepare("UPDATE runner_agents SET state='leased', current_job_id=?, last_seen_at=? WHERE id=?").bind(candidate.id, timestamp, runnerId)
  ]);
  return runnerJob(env, candidate.id);
}

async function runnerJob(env, jobId) {
  const job = await env.DB.prepare("SELECT j.id, j.app_id, j.artifact_id, j.state, j.device_serial, j.lease_expires_at, a.file_name, a.sha256, a.byte_size FROM test_jobs j JOIN test_artifacts a ON a.id=j.artifact_id WHERE j.id=?").bind(jobId).first();
  if (!job) return json({ error: "Job not found." }, 404);
  const steps = await env.DB.prepare("SELECT id, step_index, script_id, state FROM test_job_steps WHERE job_id=? ORDER BY step_index").bind(jobId).all();
  return json({ job: { ...job, artifactUrl: `/api/runner/artifacts/${job.artifact_id}`, steps: steps.results || [] } });
}

async function heartbeat(request, env) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "");
  const jobId = String(input?.jobId || "");
  const job = await ownedJob(env, jobId, runnerId);
  if (!job || !["leased", "running"].includes(job.state)) return json({ error: "Active lease not found." }, 409);
  const timestamp = now();
  const expires = leaseUntil();
  await env.DB.batch([
    env.DB.prepare("UPDATE test_jobs SET state='running', lease_expires_at=?, updated_at=?, started_at=COALESCE(started_at, ?) WHERE id=? AND leased_by=?").bind(expires, timestamp, timestamp, jobId, runnerId),
    env.DB.prepare("UPDATE device_leases SET lease_expires_at=? WHERE job_id=? AND runner_id=?").bind(expires, jobId, runnerId),
    env.DB.prepare("UPDATE runner_agents SET state='running', current_job_id=?, last_seen_at=? WHERE id=?").bind(jobId, timestamp, runnerId)
  ]);
  return json({ leaseExpiresAt: expires });
}

async function updateStep(request, env, jobId, stepId) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "");
  const state = String(input?.state || "");
  if (!["running", ...terminalSteps].includes(state)) return json({ error: "Invalid step state." }, 400);
  const job = await ownedJob(env, jobId, runnerId);
  if (!job || !["leased", "running"].includes(job.state)) return json({ error: "Active lease not found." }, 409);
  const step = await env.DB.prepare("SELECT id, state FROM test_job_steps WHERE id=? AND job_id=?").bind(stepId, jobId).first();
  if (!step) return json({ error: "Step not found." }, 404);
  if (terminalSteps.has(step.state)) return json({ error: "A completed step is immutable." }, 409);
  const timestamp = now();
  await env.DB.prepare("UPDATE test_job_steps SET state=?, started_at=COALESCE(started_at, ?), completed_at=?, exit_code=?, result_json=? WHERE id=? AND job_id=?").bind(state, timestamp, terminalSteps.has(state) ? timestamp : null, Number.isInteger(input?.exitCode) ? input.exitCode : null, input?.result ? JSON.stringify(input.result).slice(0, 200_000) : null, stepId, jobId).run();
  return json({ ok: true });
}

async function completeJob(request, env, jobId) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "");
  const job = await ownedJob(env, jobId, runnerId);
  if (!job) return json({ error: "Active lease not found." }, 409);
  const result = await env.DB.prepare("SELECT state FROM test_job_steps WHERE job_id=? ORDER BY step_index").bind(jobId).all();
  const states = (result.results || []).map((row) => row.state);
  if (!states.length || states.some((state) => !terminalSteps.has(state))) return json({ error: "Every ordered step must reach a terminal state." }, 409);
  const finalState = states.includes("failed") ? "failed" : states.some((state) => state !== "passed") ? "blocked" : "completed";
  const timestamp = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE test_jobs SET state=?, completed_at=?, updated_at=?, lease_expires_at=NULL, result_summary=? WHERE id=? AND leased_by=?").bind(finalState, timestamp, timestamp, JSON.stringify({ stepStates: states, runnerSummary: input?.summary || null }).slice(0, 50_000), jobId, runnerId),
    env.DB.prepare("DELETE FROM device_leases WHERE job_id=? AND runner_id=?").bind(jobId, runnerId),
    env.DB.prepare("UPDATE runner_agents SET state='idle', current_job_id=NULL, last_seen_at=? WHERE id=?").bind(timestamp, runnerId)
  ]);
  return json({ state: finalState });
}

async function runnerArtifact(env, artifactId) {
  const artifact = await env.DB.prepare("SELECT object_key, file_name, sha256 FROM test_artifacts WHERE id=?").bind(artifactId).first();
  if (!artifact) return json({ error: "Artifact not found." }, 404);
  const object = await env.ARTIFACTS.get(artifact.object_key);
  if (!object) return json({ error: "Artifact bytes are unavailable." }, 404);
  return new Response(object.body, { headers: { "content-type": "application/vnd.android.package-archive", "content-disposition": `attachment; filename="${safeFileName(artifact.file_name, "app.apk")}"`, "x-artifact-sha256": artifact.sha256 } });
}

async function uploadEvidence(request, env, jobId) {
  const runnerId = request.headers.get("x-runner-id") || "";
  const job = await ownedJob(env, jobId, runnerId);
  if (!job) return json({ error: "Active lease not found." }, 409);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 50_000_000) return json({ error: "Evidence size is outside the allowed range." }, 413);
  const id = crypto.randomUUID();
  const fileName = safeFileName(request.headers.get("x-file-name"), "evidence.bin");
  const contentType = (request.headers.get("content-type") || "application/octet-stream").slice(0, 100);
  const hash = await sha256Hex(bytes);
  const objectKey = `evidence/${jobId}/${id}/${fileName}`;
  await env.ARTIFACTS.put(objectKey, bytes, { httpMetadata: { contentType }, customMetadata: { sha256: hash, jobId } });
  await env.DB.prepare("INSERT INTO test_evidence (id, job_id, step_id, file_name, content_type, object_key, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, jobId, request.headers.get("x-step-id") || null, fileName, contentType, objectKey, bytes.byteLength, hash, now()).run();
  return json({ id, sha256: hash }, 201);
}

export async function downloadEvidence(env, evidenceId) {
  const record = await env.DB.prepare("SELECT object_key, file_name, content_type FROM test_evidence WHERE id=?").bind(evidenceId).first();
  if (!record) return json({ error: "Evidence not found." }, 404);
  const object = await env.ARTIFACTS.get(record.object_key);
  if (!object) return json({ error: "Evidence bytes are unavailable." }, 404);
  return new Response(object.body, { headers: { "content-type": record.content_type, "content-disposition": `attachment; filename="${safeFileName(record.file_name, "evidence.bin")}"` } });
}

export async function handleRunnerApi(request, env, url) {
  const unavailable = requireBindings(env, true);
  if (unavailable) return unavailable;
  if (!await runnerAuthorized(request, env)) return json({ error: "Runner authentication required." }, 401);
  if (request.method === "POST" && url.pathname === "/api/runner/lease") return leaseJob(request, env);
  if (request.method === "POST" && url.pathname === "/api/runner/heartbeat") return heartbeat(request, env);
  const artifact = url.pathname.match(/^\/api\/runner\/artifacts\/([A-Za-z0-9-]+)$/);
  if (request.method === "GET" && artifact) return runnerArtifact(env, artifact[1]);
  const step = url.pathname.match(/^\/api\/runner\/jobs\/([A-Za-z0-9-]+)\/steps\/([A-Za-z0-9-]+)$/);
  if (request.method === "POST" && step) return updateStep(request, env, step[1], step[2]);
  const complete = url.pathname.match(/^\/api\/runner\/jobs\/([A-Za-z0-9-]+)\/complete$/);
  if (request.method === "POST" && complete) return completeJob(request, env, complete[1]);
  const evidence = url.pathname.match(/^\/api\/runner\/jobs\/([A-Za-z0-9-]+)\/evidence$/);
  if (request.method === "PUT" && evidence) return uploadEvidence(request, env, evidence[1]);
  return json({ error: "Runner endpoint not found." }, 404);
}
