export const BETA_APPLICATION_STATES = Object.freeze([
  "submitted",
  "manual_review",
  "approved",
  "invited",
  "enrolled",
  "removed",
  "rejected",
]);

export const BETA_EVENT_TYPES = Object.freeze([
  "application_submitted",
  "manual_review_recorded",
  "approval_recorded",
  "invitation_queued",
  "group_enrollment_queued",
  "play_track_sync_queued",
  "enrollment_confirmed",
  "tester_removed",
  "consent_updated",
  "credit_verified",
  "data_correction_requested",
  "data_deletion_requested",
  "data_request_resolved",
]);

export const DATA_REQUEST_TYPES = Object.freeze(["correction", "deletion"]);

function requireText(value, code, maximumLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximumLength) {
    throw new Error(code);
  }
  return value.trim();
}

function email(value, code = "invalid_beta_email") {
  const normalized = requireText(value, code, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error(code);
  return normalized;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function applicationEmail(application) {
  return email(application.email);
}

function applicationInterests(application) {
  const interests = Array.isArray(application.interests)
    ? application.interests
    : parseJson(application.interests_json, []);
  if (!Array.isArray(interests) || interests.length === 0) throw new Error("missing_beta_interests");
  const unique = [...new Set(interests.map((item) => requireText(item, "invalid_beta_interest", 80).toLowerCase()))];
  if (unique.length !== interests.length || unique.some((item) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item))) {
    throw new Error("invalid_beta_interest");
  }
  return unique;
}

function applicationConsent(application) {
  const consent = application.consent && typeof application.consent === "object"
    ? application.consent
    : parseJson(application.consent_json, {});
  if (!consent.consentVersion && !consent.version) throw new Error("missing_consent_version");
  return {
    ...consent,
    consentVersion: consent.consentVersion || consent.version,
    publicCredit: Boolean(consent.publicCredit || consent.publicCreditConsent),
  };
}

export function createBetaEvent(application, eventType, options = {}) {
  if (!BETA_EVENT_TYPES.includes(eventType)) throw new Error("invalid_beta_event_type");
  const interests = applicationInterests(application);
  const productSlug = options.productSlug || interests[0];
  const trackName = options.trackName || "internal";
  const now = options.now || new Date().toISOString();
  return {
    id: options.id || `beta-event-${crypto.randomUUID()}`,
    beta_application_id: requireText(application.id, "invalid_beta_application_id", 120),
    email: applicationEmail(application),
    event_type: eventType,
    product_slug: requireText(productSlug, "invalid_beta_product_slug", 80),
    track_name: requireText(trackName, "invalid_beta_track", 80),
    actor_email: email(options.actorEmail || "system@techmaxxed.com", "invalid_beta_actor_email"),
    details_json: JSON.stringify(options.details || {}),
    created_at: now,
    updated_at: now,
  };
}

export function approveBetaApplication(application, options = {}) {
  const allowed = new Set(["submitted", "manual_review", "pending", "approved"]);
  const current = application.status || "submitted";
  if (!allowed.has(current)) throw new Error("beta_state_conflict:not_reviewable");
  const consent = applicationConsent(application);
  const interests = applicationInterests(application);
  const now = options.now || new Date().toISOString();
  const reviewerEmail = email(options.reviewerEmail, "invalid_beta_reviewer_email");
  return {
    application: {
      ...application,
      email: applicationEmail(application),
      interests_json: JSON.stringify(interests),
      consent_json: JSON.stringify({ ...consent, reviewedAt: now, reviewedBy: reviewerEmail }),
      status: "approved",
      updated_at: now,
    },
    events: [
      createBetaEvent(application, "manual_review_recorded", { ...options, actorEmail: reviewerEmail, details: { notes: options.notes || "" } }),
      createBetaEvent(application, "approval_recorded", { ...options, actorEmail: reviewerEmail, details: { consentVersion: consent.consentVersion } }),
    ],
  };
}

export function buildEnrollmentPlan(application, options = {}) {
  if (application.status !== "approved" && application.status !== "invited") {
    throw new Error("beta_state_conflict:approval_required");
  }
  const interests = applicationInterests(application);
  const defaultDomain = options.groupDomain || "groups.techmaxxed.com";
  const trackName = options.trackName || "internal";
  return interests.map((productSlug) => ({
    productSlug,
    trackName,
    email: applicationEmail(application),
    groupEmail: options.groups?.[productSlug] || `${productSlug}-beta@${defaultDomain}`,
  }));
}

export function queueEnrollmentEvents(application, options = {}) {
  const actorEmail = options.actorEmail || "system@techmaxxed.com";
  return buildEnrollmentPlan(application, options).flatMap((item) => [
    createBetaEvent(application, "invitation_queued", { ...options, actorEmail, productSlug: item.productSlug, trackName: item.trackName, details: { email: item.email } }),
    createBetaEvent(application, "group_enrollment_queued", { ...options, actorEmail, productSlug: item.productSlug, trackName: item.trackName, details: { groupEmail: item.groupEmail } }),
    createBetaEvent(application, "play_track_sync_queued", { ...options, actorEmail, productSlug: item.productSlug, trackName: item.trackName, details: { groupEmail: item.groupEmail } }),
  ]);
}

export function createDataRequest(application, options = {}) {
  if (!DATA_REQUEST_TYPES.includes(options.requestType)) throw new Error("invalid_beta_data_request_type");
  const now = options.now || new Date().toISOString();
  const requester = email(options.requestedBy || application.email, "invalid_beta_requester_email");
  return {
    id: options.id || `beta-data-${crypto.randomUUID()}`,
    beta_application_id: requireText(application.id, "invalid_beta_application_id", 120),
    email: applicationEmail(application),
    request_type: options.requestType,
    status: "open",
    requested_by: requester,
    details_json: JSON.stringify(options.details || {}),
    resolved_at: "",
    created_at: now,
    updated_at: now,
  };
}

export function applyTesterRemoval(application, options = {}) {
  const now = options.now || new Date().toISOString();
  const actorEmail = email(options.actorEmail, "invalid_beta_actor_email");
  return {
    application: {
      ...application,
      status: "removed",
      updated_at: now,
    },
    events: queueEnrollmentEvents({ ...application, status: "approved" }, { ...options, actorEmail })
      .filter((event) => event.event_type === "group_enrollment_queued")
      .map((event) => ({
        ...event,
        id: `beta-event-${crypto.randomUUID()}`,
        event_type: "tester_removed",
        details_json: JSON.stringify({ reason: options.reason || "manual removal", groupEmail: JSON.parse(event.details_json).groupEmail }),
      })),
  };
}
