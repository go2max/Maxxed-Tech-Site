export function loadPlatformConfig(env = {}) {
  const appEnv = env.APP_ENV || "development";
  const allowDevelopmentIdentityOverride =
    appEnv === "development" && env.ALLOW_DEV_IDENTITY_OVERRIDE === "true";

  return {
    appEnv,
    allowDevelopmentIdentityOverride,
    trustedIdentityEmailHeader: env.TRUSTED_IDENTITY_EMAIL_HEADER || "cf-access-authenticated-user-email",
    trustedIdentitySubjectHeader: env.TRUSTED_IDENTITY_SUBJECT_HEADER || "cf-access-authenticated-user-id",
    trustedIdentityNameHeader: env.TRUSTED_IDENTITY_NAME_HEADER || "cf-access-authenticated-user-name",
    sessionSecret: env.SESSION_SECRET || "dev-session-secret-not-for-production",
    sessionAbsoluteTtlMs: Number(env.SESSION_ABSOLUTE_TTL_MS || 8 * 60 * 60 * 1000),
    sessionIdleTtlMs: Number(env.SESSION_IDLE_TTL_MS || 30 * 60 * 1000),
    maxRequestBytes: Number(env.MAX_REQUEST_BYTES || 16384),
  };
}
