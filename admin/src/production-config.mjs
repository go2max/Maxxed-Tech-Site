const REQUIRED_PRODUCTION = [
  "ADMIN_ENV",
  "ADMIN_PUBLIC_HOST",
  "ADMIN_REQUIRE_ACCESS",
  "ADMIN_ALLOW_MOCK_IDENTITY",
  "ADMIN_ALLOWED_EMAIL_DOMAINS",
];

export function readAdminRuntimeConfig(env = process.env) {
  return {
    envName: env.ADMIN_ENV || "development",
    publicHost: env.ADMIN_PUBLIC_HOST || "localhost",
    requireAccess: env.ADMIN_REQUIRE_ACCESS === "true",
    allowMockIdentity: env.ADMIN_ALLOW_MOCK_IDENTITY === "true",
    allowedEmailDomains: String(env.ADMIN_ALLOWED_EMAIL_DOMAINS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    hasD1Binding: Boolean(env.ADMIN_DB || env.ADMIN_D1_DATABASE_ID),
    hasEvidenceBucket: Boolean(env.ADMIN_EVIDENCE_BUCKET || env.ADMIN_R2_BUCKET),
  };
}

export function validateAdminProductionConfig(env = process.env) {
  const config = readAdminRuntimeConfig(env);
  const errors = [];
  if (config.envName === "production") {
    for (const key of REQUIRED_PRODUCTION) {
      if (!(key in env) || String(env[key]).trim() === "") errors.push(`missing_${key.toLowerCase()}`);
    }
    if (config.publicHost !== "admin.techmaxxed.com") errors.push("invalid_admin_public_host");
    if (!config.requireAccess) errors.push("cloudflare_access_required");
    if (config.allowMockIdentity) errors.push("mock_identity_forbidden_in_production");
    if (!config.allowedEmailDomains.length) errors.push("allowed_email_domain_required");
    if (!config.hasD1Binding) errors.push("admin_d1_binding_required");
  }
  return { ok: errors.length === 0, errors, config };
}
