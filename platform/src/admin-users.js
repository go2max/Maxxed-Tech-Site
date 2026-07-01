const roles = {
  owner: ["audit:view", "settings:manage", "catalog:view", "catalog:edit", "worker:queue", "worker:cancel", "github:write", "codex:run"],
  builder: ["catalog:view", "catalog:edit", "worker:queue", "github:write", "codex:run"],
  qa: ["catalog:view", "worker:queue"],
  viewer: ["catalog:view", "audit:view"]
};

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const now = () => new Date().toISOString();
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

function splitEmails(value) {
  return String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function envRole(email, env) {
  if (splitEmails(env.ADMIN_OWNER_EMAILS).includes(email)) return "owner";
  if (splitEmails(env.ADMIN_BUILDER_EMAILS).includes(email)) return "builder";
  if (splitEmails(env.ADMIN_QA_EMAILS).includes(email)) return "qa";
  if (splitEmails(env.ADMIN_VIEWER_EMAILS).includes(email)) return "viewer";
  const allowed = splitEmails(env.ADMIN_ALLOWED_EMAILS);
  return allowed[0] === email ? "owner" : allowed.includes(email) ? "builder" : null;
}

async function dbUser(email, env) {
  if (!env.DB) return null;
  try {
    return await env.DB.prepare("SELECT email, role, status, display_name, created_by, created_at, updated_at FROM admin_users WHERE email=?").bind(email).first();
  } catch {
    return null;
  }
}

export async function actorRole(email, env) {
  const record = await dbUser(email, env);
  if (record?.status === "disabled") return null;
  if (record?.status === "active" && roles[record.role]) return record.role;
  return envRole(email, env);
}

export async function actorCan(email, env, permission) {
  const role = await actorRole(email, env);
  return Boolean(role && roles[role]?.includes(permission));
}

async function requestBody(request) {
  try { return await request.json(); } catch { return null; }
}

export async function listAdminUsers(env) {
  const envUsers = [
    ...splitEmails(env.ADMIN_OWNER_EMAILS).map((email) => ({ email, role: "owner", status: "active", source: "env" })),
    ...splitEmails(env.ADMIN_BUILDER_EMAILS).map((email) => ({ email, role: "builder", status: "active", source: "env" })),
    ...splitEmails(env.ADMIN_QA_EMAILS).map((email) => ({ email, role: "qa", status: "active", source: "env" })),
    ...splitEmails(env.ADMIN_VIEWER_EMAILS).map((email) => ({ email, role: "viewer", status: "active", source: "env" }))
  ];
  if (!envUsers.length) {
    const allowed = splitEmails(env.ADMIN_ALLOWED_EMAILS);
    envUsers.push(...allowed.map((email, index) => ({ email, role: index === 0 ? "owner" : "builder", status: "active", source: "env-fallback" })));
  }

  const merged = new Map(envUsers.map((user) => [user.email, user]));
  if (env.DB) {
    const result = await env.DB.prepare("SELECT email, role, status, display_name, created_by, created_at, updated_at FROM admin_users ORDER BY email").all();
    for (const user of result.results || []) merged.set(user.email, { ...user, source: "db" });
  }
  return json({ roles, users: [...merged.values()].sort((left, right) => left.email.localeCompare(right.email)) });
}

export async function upsertAdminUser(request, env, actorEmail) {
  if (!await actorCan(actorEmail, env, "settings:manage")) return json({ error: "Owner role required." }, 403);
  if (!env.DB) return json({ error: "The private settings database is not configured." }, 503);
  const input = await requestBody(request);
  const email = String(input?.email || "").trim().toLowerCase();
  const role = String(input?.role || "").trim();
  const status = String(input?.status || "active").trim();
  const displayName = String(input?.displayName || "").trim().slice(0, 120);
  if (!validEmail(email)) return json({ error: "A valid email is required." }, 400);
  if (!roles[role]) return json({ error: "Choose a valid role." }, 400);
  if (!["active", "disabled"].includes(status)) return json({ error: "Choose active or disabled." }, 400);
  const timestamp = now();
  await env.DB.prepare(
    "INSERT INTO admin_users (email, role, status, display_name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET role=excluded.role, status=excluded.status, display_name=excluded.display_name, updated_at=excluded.updated_at"
  ).bind(email, role, status, displayName || null, actorEmail, timestamp, timestamp).run();
  return json({ user: { email, role, status, display_name: displayName || null, updated_at: timestamp } }, 201);
}
