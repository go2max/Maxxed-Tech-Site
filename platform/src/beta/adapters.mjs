function requireText(value, code, maximumLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximumLength) throw new Error(code);
  return value.trim();
}

function requireEmail(value, code = "invalid_email") {
  const normalized = requireText(value, code, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error(code);
  return normalized;
}

function requireSlug(value, code) {
  const slug = requireText(value, code, 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(code);
  return slug;
}

function requireObject(value, code, maximumBytes = 4000) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  if (JSON.stringify(value).length > maximumBytes) throw new Error(code);
  return value;
}

export class DisabledIntegrationAdapter {
  constructor(name) {
    this.name = name;
  }

  status() {
    return {
      adapter: this.name,
      state: "unavailable",
      configured: false,
    };
  }

  async enrollTester() {
    throw new Error("integration_unavailable");
  }

  async removeTester() {
    throw new Error("integration_unavailable");
  }

  async syncTrack() {
    throw new Error("integration_unavailable");
  }

  async fetchReportingMetrics() {
    throw new Error("integration_unavailable");
  }
}

export class PlannedGoogleWorkspaceAdapter extends DisabledIntegrationAdapter {
  constructor(config = {}) {
    super("google-workspace");
    this.config = config;
  }

  status() {
    return {
      adapter: this.name,
      state: this.config.serviceAccountEmail ? "configured" : "unavailable",
      configured: Boolean(this.config.serviceAccountEmail),
      serviceAccountEmail: this.config.serviceAccountEmail || "",
    };
  }

  buildMembershipPayload({ email, groupEmail, role = "MEMBER" }) {
    return {
      email: requireEmail(email, "invalid_beta_email"),
      groupEmail: requireEmail(groupEmail, "invalid_google_group_email"),
      role: requireText(role, "invalid_google_group_role", 40).toUpperCase(),
    };
  }
}

export class PlannedGooglePlayAdapter extends DisabledIntegrationAdapter {
  constructor(config = {}) {
    super("google-play");
    this.config = config;
  }

  status() {
    return {
      adapter: this.name,
      state: this.config.packageName ? "configured" : "unavailable",
      configured: Boolean(this.config.packageName),
      packageName: this.config.packageName || "",
    };
  }

  buildTrackSyncPayload({ packageName = this.config.packageName, productSlug, trackName, groupEmail }) {
    return {
      packageName: requireText(packageName, "invalid_play_package", 200),
      productSlug: requireSlug(productSlug, "invalid_beta_product_slug"),
      trackName: requireText(trackName, "invalid_play_track", 80),
      groupEmail: requireEmail(groupEmail, "invalid_google_group_email"),
    };
  }

  buildReportingSyncRecord({ productSlug, trackName, metrics, collectedAt }) {
    const timestamp = collectedAt || new Date().toISOString();
    if (!Number.isFinite(Date.parse(timestamp))) throw new Error("invalid_reporting_timestamp");
    return {
      productSlug: requireSlug(productSlug, "invalid_beta_product_slug"),
      trackName: requireText(trackName, "invalid_play_track", 80),
      collectedAt: timestamp,
      metrics: requireObject(metrics, "invalid_reporting_metrics", 8000),
    };
  }
}

export function createBetaAdapters(env = {}) {
  return {
    googleWorkspace: new PlannedGoogleWorkspaceAdapter({
      serviceAccountEmail: env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL || "",
    }),
    googlePlay: new PlannedGooglePlayAdapter({
      packageName: env.GOOGLE_PLAY_PACKAGE_NAME || "",
    }),
  };
}

export function validateBetaSubmission(payload) {
  const interests = Array.isArray(payload.interests) ? payload.interests : [];
  if (interests.length === 0 || interests.length > 20) throw new Error("missing_interests");
  const normalizedInterests = interests.map((item) => requireSlug(item, "invalid_interest"));
  if (new Set(normalizedInterests).size !== normalizedInterests.length) throw new Error("invalid_interest");
  const consentVersion = requireText(payload.consentVersion, "missing_consent_version", 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(consentVersion)) throw new Error("invalid_consent_version");
  return {
    email: requireEmail(payload.email),
    interests: normalizedInterests,
    device: requireObject(payload.device || {}, "invalid_device", 4000),
    consentVersion,
    creditName: payload.creditName ? requireText(payload.creditName, "invalid_credit_name", 80) : "",
    publicCreditConsent: Boolean(payload.publicCreditConsent),
  };
}

export function revokePublicCredit(record) {
  return {
    ...record,
    publicCreditConsent: false,
    creditDisplayState: "withdrawn",
  };
}
