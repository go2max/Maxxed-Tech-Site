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
}

export function createBetaAdapters() {
  return {
    googleWorkspace: new DisabledIntegrationAdapter("google-workspace"),
    googlePlay: new DisabledIntegrationAdapter("google-play"),
  };
}

export function validateBetaSubmission(payload) {
  if (!payload.email || !payload.email.includes("@")) throw new Error("invalid_email");
  if (!Array.isArray(payload.interests) || payload.interests.length === 0) throw new Error("missing_interests");
  if (!payload.consentVersion) throw new Error("missing_consent_version");
  return {
    email: payload.email.toLowerCase(),
    interests: payload.interests,
    device: payload.device || {},
    consentVersion: payload.consentVersion,
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
