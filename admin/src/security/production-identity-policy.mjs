const TRUSTED_EMAIL_HEADERS = ["cf-access-authenticated-user-email", "x-authenticated-user-email"];

export function normalizeHeaders(headers = {}) {
  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  return Object.fromEntries(entries.map(([key, value]) => [String(key).toLowerCase(), String(value)]));
}

export function getTrustedAdminEmail(headers = {}, options = {}) {
  const normalized = normalizeHeaders(headers);
  const unique = [...new Set(TRUSTED_EMAIL_HEADERS.map((name) => normalized[name]).filter(Boolean).map((value) => value.trim().toLowerCase()))];
  if (unique.length !== 1) return { ok: false, error: unique.length === 0 ? "missing_trusted_identity" : "mismatched_trusted_identity" };
  const email = unique[0];
  const domain = email.split("@").at(-1);
  const allowedDomains = (options.allowedDomains || []).map((item) => String(item).toLowerCase());
  if (allowedDomains.length && !allowedDomains.includes(domain)) return { ok: false, error: "identity_domain_not_allowed" };
  if (options.production && normalized["x-admin-mock-identity"]) return { ok: false, error: "mock_identity_header_forbidden" };
  return { ok: true, email };
}

export function requireAdminIdentity(headers = {}, options = {}) {
  const result = getTrustedAdminEmail(headers, options);
  if (!result.ok) {
    const error = new Error(result.error);
    error.status = 401;
    throw error;
  }
  return result.email;
}
