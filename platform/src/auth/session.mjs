const encoder = new TextEncoder();

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(secret, payload) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

export async function createSession(identity, config, now = Date.now(), existingSession = null) {
  const issuedAt =
    existingSession?.subject === identity.subject
    && existingSession?.email === identity.email
    && existingSession.expiresAt > now
      ? existingSession.issuedAt
      : now;
  const expiresAt =
    existingSession?.subject === identity.subject
    && existingSession?.email === identity.email
    && existingSession.expiresAt > now
      ? existingSession.expiresAt
      : now + config.sessionAbsoluteTtlMs;
  const nonce =
    existingSession?.subject === identity.subject
    && existingSession?.email === identity.email
    && existingSession.expiresAt > now
      ? existingSession.nonce
      : crypto.randomUUID();
  const body = {
    email: identity.email,
    subject: identity.subject,
    roles: identity.roles,
    source: identity.source,
    issuedAt,
    expiresAt,
    idleAt: now + config.sessionIdleTtlMs,
    nonce,
  };
  const payload = toBase64Url(JSON.stringify(body));
  const signature = await sign(config.sessionSecret, payload);
  return `${payload}.${signature}`;
}

export async function readSession(sessionToken, config, now = Date.now()) {
  if (!sessionToken?.includes(".")) return null;
  const [payload, signature] = sessionToken.split(".");
  const expected = await sign(config.sessionSecret, payload);
  if (expected !== signature) return null;

  const body = JSON.parse(fromBase64Url(payload));
  if (body.expiresAt < now || body.idleAt < now) return null;
  return body;
}

export async function createCsrfToken(session, config) {
  const payload = `${session.email}:${session.subject}:${session.nonce}:${session.expiresAt}`;
  return sign(config.sessionSecret, payload);
}

export function sessionMatchesIdentity(session, identity) {
  return session?.email === identity.email && session?.subject === identity.subject;
}
