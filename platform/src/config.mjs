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

function parseRunnerTokens(value) {
  if (value == null || value === "") return Object.freeze({});
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("invalid_runner_api_tokens");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid_runner_api_tokens");
  }
  const entries = Object.entries(parsed);
  if (entries.length === 0 || entries.length > 100) throw new Error("invalid_runner_api_tokens");
  const normalized = {};
  for (const [runnerId, value] of entries) {
    const tokens = Array.isArray(value) ? value : [value];
    if (!/^[A-Za-z0-9._:-]{1,80}$/.test(runnerId) ||
        tokens.length === 0 || tokens.length > 2 ||
        new Set(tokens).size !== tokens.length ||
        tokens.some((token) => typeof token !== "string" || token.length < 32)) {
      throw new Error("invalid_runner_api_tokens");
    }
    normalized[runnerId] = Object.freeze([...tokens]);
  }
  return Object.freeze(normalized);
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
    bootstrapOwnerEmail: String(env.BOOTSTRAP_OWNER_EMAIL || (isProduction ? "" : "owner@techmaxxed.com")).trim().toLowerCase(),
    trustedIdentityJwtHeader: env.TRUSTED_IDENTITY_JWT_HEADER || "cf-access-jwt-assertion",
    trustedIdentityEmailHeader: env.TRUSTED_IDENTITY_EMAIL_HEADER || "cf-access-authenticated-user-email",
    trustedIdentitySubjectHeader: env.TRUSTED_IDENTITY_SUBJECT_HEADER || "cf-access-authenticated-user-id",
    trustedIdentityNameHeader: env.TRUSTED_IDENTITY_NAME_HEADER || "cf-access-authenticated-user-name",
    trustedIdentityIssuer: env.TRUSTED_IDENTITY_ISSUER || (env.CF_ACCESS_TEAM_DOMAIN ? `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com` : null),
    trustedIdentityAudience: env.TRUSTED_IDENTITY_AUDIENCE || env.CF_ACCESS_AUD || null,
    trustedIdentityJwtAlgorithm: env.TRUSTED_IDENTITY_JWT_ALGORITHM || "RS256",
    trustedIdentityJwtKey: env.TRUSTED_IDENTITY_JWT_KEY || env.CF_ACCESS_JWT_PUBLIC_KEY || env.CF_ACCESS_JWT_SECRET || null,
    sessionSecret,
    runnerApiToken: typeof env.RUNNER_API_TOKEN === "string" && env.RUNNER_API_TOKEN.length >= 32 ? env.RUNNER_API_TOKEN : null,
    runnerApiTokens: parseRunnerTokens(env.RUNNER_API_TOKENS_JSON),
    runnerLeaseTtlMs: requirePositiveNumber(env.RUNNER_LEASE_TTL_MS, 5 * 60 * 1000, "invalid_runner_lease_ttl"),
    runnerFleetStaleMs: requirePositiveNumber(env.RUNNER_FLEET_STALE_MS, 2 * 60 * 1000, "invalid_runner_fleet_stale"),
    runnerFleetOfflineMs: requirePositiveNumber(env.RUNNER_FLEET_OFFLINE_MS, 10 * 60 * 1000, "invalid_runner_fleet_offline"),
    evidenceMaxBytes: requirePositiveNumber(env.EVIDENCE_MAX_BYTES, 25 * 1024 * 1024, "invalid_evidence_max_bytes"),
    evidenceRetentionDays: requirePositiveNumber(env.EVIDENCE_RETENTION_DAYS, 30, "invalid_evidence_retention_days"),
    backupEncryptionKey: String(env.BACKUP_ENCRYPTION_KEY || ""),
    backupScheduleEnabled: env.BACKUP_SCHEDULE_ENABLED === "true",
    backupIntervalHours: requirePositiveNumber(env.BACKUP_INTERVAL_HOURS, 24, "invalid_backup_interval_hours"),
    backupRetentionDays: requirePositiveNumber(env.BACKUP_RETENTION_DAYS, 30, "invalid_backup_retention_days"),
    backupMaxBytes: requirePositiveNumber(env.BACKUP_MAX_BYTES, 100 * 1024 * 1024, "invalid_backup_max_bytes"),
    monitorStaleHours: requirePositiveNumber(env.MONITOR_STALE_HOURS, 24, "invalid_monitor_stale_hours"),
    backupHealthStaleHours: requirePositiveNumber(env.BACKUP_HEALTH_STALE_HOURS, 48, "invalid_backup_health_stale_hours"),
    sessionAbsoluteTtlMs: requirePositiveNumber(env.SESSION_ABSOLUTE_TTL_MS, DEFAULT_SESSION_ABSOLUTE_TTL_MS, "invalid_session_absolute_ttl"),
    sessionIdleTtlMs: requirePositiveNumber(env.SESSION_IDLE_TTL_MS, DEFAULT_SESSION_IDLE_TTL_MS, "invalid_session_idle_ttl"),
    maxRequestBytes: requirePositiveNumber(env.MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES, "invalid_max_request_bytes"),
    authRateLimitMax: requirePositiveNumber(env.AUTH_RATE_LIMIT_MAX, 30, "invalid_auth_rate_limit_max"),
    authRateLimitWindowMs: requirePositiveNumber(env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000, "invalid_auth_rate_limit_window"),
    mutationRateLimitMax: requirePositiveNumber(env.MUTATION_RATE_LIMIT_MAX, 60, "invalid_mutation_rate_limit_max"),
    mutationRateLimitWindowMs: requirePositiveNumber(env.MUTATION_RATE_LIMIT_WINDOW_MS, 60_000, "invalid_mutation_rate_limit_window"),
  };

  if (config.bootstrapOwnerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.bootstrapOwnerEmail)) {
    throw new Error("invalid_bootstrap_owner_email");
  }
  if (config.sessionIdleTtlMs > config.sessionAbsoluteTtlMs) {
    throw new Error("invalid_session_ttls");
  }
  if (config.runnerFleetOfflineMs <= config.runnerFleetStaleMs) {
    throw new Error("invalid_runner_fleet_thresholds");
  }
  if (config.evidenceMaxBytes > 100 * 1024 * 1024 || config.evidenceRetentionDays > 3650) {
    throw new Error("invalid_evidence_limits");
  }
  if (config.backupIntervalHours > 168 || config.backupRetentionDays > 3650 ||
      config.backupMaxBytes > 500 * 1024 * 1024 || config.monitorStaleHours > 720 ||
      config.backupHealthStaleHours > 720) {
    throw new Error("invalid_backup_limits");
  }

  if (!isStrongSessionSecret(config.sessionSecret)) {
    if (isProduction) throw new Error("weak_or_missing_session_secret");
    config.sessionSecret = "local-development-session-secret-minimum-32";
  }

  if (isProduction) {
    if (config.trustedIdentityJwtAlgorithm !== "RS256") {
      throw new Error("production_identity_algorithm_must_be_rs256");
    }
    requireString(config.trustedIdentityAudience, "missing_identity_audience");
    requireString(config.trustedIdentityIssuer, "missing_identity_issuer");
    requireString(config.trustedIdentityJwtKey, "missing_identity_jwt_key");
  }

  return config;
}

export function validatePlatformConfig(env = {}) {
  return loadPlatformConfig(env);
}
