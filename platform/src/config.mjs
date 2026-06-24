const DEFAULT_SESSION_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_REQUEST_BYTES = 16_384;
const MIN_SESSION_SECRET_LENGTH = 32;

function requireString(value, code) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(code);
  }
  return value.trim();
}

function requirePositiveNumber(value, fallback, code) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(code);
  }
  return parsed;
}

function isStrongSessionSecret(secret) {
  if (typeof secret !== "string") return false;
  if (secret.length < MIN_SESSION_SECRET_LENGTH) return false;
  return !/^(dev|test|changeme|default|secret|password)/i.test(secret);
}

export function loadPlatformConfig(env = {}) {
  const appEnv = env.APP_ENV || "development";
  const isProduction = appEnv === "production";
  const isTest = appEnv === "test";
  const allowDevelopmentIdentityOverride =
    appEnv === "development" && env.ALLOW_DEV_IDENTITY_OVERRIDE === "true";
  const sessionSecret = env.SESSION_SECRET || (isProduction ? null : "local-development-session-secret-minimum-32");
  const config = {
    appEnv,
    isProduction,
    isTest,
    allowDevelopmentIdentityOverride,
    trustedIdentityJwtHeader: env.TRUSTED_IDENTITY_JWT_HEADER || "cf-access-jwt-assertion",
    trustedIdentityEmailHeader: env.TRUSTED_IDENTITY_EMAIL_HEADER || "cf-access-authenticated-user-email",
    trustedIdentitySubjectHeader: env.TRUSTED_IDENTITY_SUBJECT_HEADER || "cf-access-authenticated-user-id",
    trustedIdentityNameHeader: env.TRUSTED_IDENTITY_NAME_HEADER || "cf-access-authenticated-user-name",
    trustedIdentityIssuer: env.TRUSTED_IDENTITY_ISSUER || (env.CF_ACCESS_TEAM_DOMAIN ? `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com` : null),
    trustedIdentityAudience: env.TRUSTED_IDENTITY_AUDIENCE || env.CF_ACCESS_AUD || null,
    trustedIdentityJwtAlgorithm: env.TRUSTED_IDENTITY_JWT_ALGORITHM || "HS256",
    trustedIdentityJwtKey: env.TRUSTED_IDENTITY_JWT_KEY || env.CF_ACCESS_JWT_PUBLIC_KEY || env.CF_ACCESS_JWT_SECRET || null,
    sessionSecret,
    sessionAbsoluteTtlMs: requirePositiveNumber(env.SESSION_ABSOLUTE_TTL_MS, DEFAULT_SESSION_ABSOLUTE_TTL_MS, "invalid_session_absolute_ttl"),
    sessionIdleTtlMs: requirePositiveNumber(env.SESSION_IDLE_TTL_MS, DEFAULT_SESSION_IDLE_TTL_MS, "invalid_session_idle_ttl"),
    maxRequestBytes: requirePositiveNumber(env.MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES, "invalid_max_request_bytes"),
    authRateLimitMax: requirePositiveNumber(env.AUTH_RATE_LIMIT_MAX, 30, "invalid_auth_rate_limit_max"),
    authRateLimitWindowMs: requirePositiveNumber(env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000, "invalid_auth_rate_limit_window"),
    mutationRateLimitMax: requirePositiveNumber(env.MUTATION_RATE_LIMIT_MAX, 60, "invalid_mutation_rate_limit_max"),
    mutationRateLimitWindowMs: requirePositiveNumber(env.MUTATION_RATE_LIMIT_WINDOW_MS, 60_000, "invalid_mutation_rate_limit_window"),
  };

  if (config.sessionIdleTtlMs > config.sessionAbsoluteTtlMs) {
    throw new Error("invalid_session_ttls");
  }

  if (!isStrongSessionSecret(config.sessionSecret)) {
    if (isProduction) throw new Error("weak_or_missing_session_secret");
    config.sessionSecret = "local-development-session-secret-minimum-32";
  }

  if (isProduction) {
    requireString(config.trustedIdentityAudience, "missing_identity_audience");
    requireString(config.trustedIdentityIssuer, "missing_identity_issuer");
    requireString(config.trustedIdentityJwtKey, "missing_identity_jwt_key");
  }

  return config;
}

export function validatePlatformConfig(env = {}) {
  return loadPlatformConfig(env);
}
