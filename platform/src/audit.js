const auditHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const now = () => new Date().toISOString();
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: auditHeaders });

function sanitize(value, fallback = "unknown", max = 240) {
  const text = String(value || fallback).trim();
  return (text || fallback).slice(0, max);
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestMetadata(request, url) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  return {
    method: request.method,
    path: url.pathname,
    ipHash: ip ? await sha256Hex(ip) : null,
    userAgent: sanitize(request.headers.get("user-agent"), "unknown", 500),
    country: sanitize(request.headers.get("cf-ipcountry"), "unknown", 16),
    ray: sanitize(request.headers.get("cf-ray"), "unknown", 80)
  };
}

export async function recordAuditEvent(env, request, url, event) {
  if (!env.DB) return;
  const details = {
    ...(event.details || {}),
    request: await requestMetadata(request, url)
  };
  await env.DB.prepare(
    "INSERT INTO audit_events (id, actor_email, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    crypto.randomUUID(),
    sanitize(event.actorEmail, "anonymous", 320).toLowerCase(),
    sanitize(event.action, "admin.event", 120),
    sanitize(event.targetType, "route", 80),
    sanitize(event.targetId || url.pathname, url.pathname, 240),
    JSON.stringify(details).slice(0, 50_000),
    now()
  ).run();
}

export async function safeAuditEvent(env, request, url, event) {
  try {
    await recordAuditEvent(env, request, url, event);
  } catch {
    // Audit logging must never make the admin portal unavailable.
  }
}

export async function listAuditEvents(env, url) {
  if (!env.DB) return json({ error: "The private audit service is not configured." }, 503);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
  const result = await env.DB.prepare(
    "SELECT id, actor_email, action, target_type, target_id, details, created_at FROM audit_events ORDER BY created_at DESC LIMIT ?"
  ).bind(limit).all();
  const events = (result.results || []).map((event) => ({
    ...event,
    details: JSON.parse(event.details || "{}")
  }));
  return json({ events });
}
