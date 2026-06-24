import test from "node:test";
import assert from "node:assert/strict";

import {
  applyTesterRemoval,
  approveBetaApplication,
  buildEnrollmentPlan,
  createBetaEvent,
  createDataRequest,
  queueEnrollmentEvents,
} from "../src/beta/workflow.mjs";

const application = {
  id: "beta-1",
  email: "Tester@Example.com",
  interests_json: JSON.stringify(["maxxed-remote", "rival-rush"]),
  consent_json: JSON.stringify({ consentVersion: "2026-06-24", publicCredit: true }),
  credits_json: JSON.stringify({ displayName: "Day One Tester", state: "pending" }),
  status: "submitted",
  created_at: "2026-06-24T10:00:00.000Z",
  updated_at: "2026-06-24T10:00:00.000Z",
};

test("manual beta approval records consent and review events", () => {
  const result = approveBetaApplication(application, {
    reviewerEmail: "beta-manager@techmaxxed.com",
    now: "2026-06-24T12:00:00.000Z",
    notes: "Device and interests verified.",
  });
  assert.equal(result.application.status, "approved");
  assert.equal(result.application.email, "tester@example.com");
  const consent = JSON.parse(result.application.consent_json);
  assert.equal(consent.consentVersion, "2026-06-24");
  assert.equal(consent.reviewedBy, "beta-manager@techmaxxed.com");
  assert.deepEqual(result.events.map((event) => event.event_type), ["manual_review_recorded", "approval_recorded"]);
});

test("approved testers get deterministic group and Play track sync plans", () => {
  const approved = { ...application, status: "approved" };
  const plan = buildEnrollmentPlan(approved, {
    groupDomain: "groups.techmaxxed.com",
    groups: { "maxxed-remote": "remote-testers@groups.techmaxxed.com" },
    trackName: "closed-beta",
  });
  assert.deepEqual(plan.map((item) => item.groupEmail), [
    "remote-testers@groups.techmaxxed.com",
    "rival-rush-beta@groups.techmaxxed.com",
  ]);
  assert.equal(plan[0].trackName, "closed-beta");

  const events = queueEnrollmentEvents(approved, {
    actorEmail: "beta-manager@techmaxxed.com",
    groupDomain: "groups.techmaxxed.com",
    trackName: "closed-beta",
  });
  assert.equal(events.length, 6);
  assert.equal(events.filter((event) => event.event_type === "play_track_sync_queued").length, 2);
});

test("privacy correction and deletion requests are durable records", () => {
  const correction = createDataRequest(application, {
    requestType: "correction",
    requestedBy: "tester@example.com",
    details: { field: "device", value: "Pixel 8 Pro" },
  });
  assert.equal(correction.request_type, "correction");
  assert.equal(correction.status, "open");
  assert.match(correction.details_json, /Pixel 8 Pro/);

  const deletion = createDataRequest(application, {
    requestType: "deletion",
    requestedBy: "privacy@techmaxxed.com",
  });
  assert.equal(deletion.email, "tester@example.com");
  assert.equal(deletion.requested_by, "privacy@techmaxxed.com");
});

test("tester removal queues removal events for every approved interest", () => {
  const removed = applyTesterRemoval({ ...application, status: "enrolled" }, {
    actorEmail: "beta-manager@techmaxxed.com",
    reason: "Tester requested removal",
  });
  assert.equal(removed.application.status, "removed");
  assert.equal(removed.events.length, 2);
  assert.equal(removed.events.every((event) => event.event_type === "tester_removed"), true);
});

test("invalid beta event types and missing approval fail closed", () => {
  assert.throws(() => createBetaEvent(application, "unknown"), /invalid_beta_event_type/);
  assert.throws(() => buildEnrollmentPlan({ ...application, status: "submitted" }), /approval_required/);
});
