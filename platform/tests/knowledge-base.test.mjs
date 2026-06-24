import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createPlatformApp } from "../src/app.mjs";
import { ROLES, permissionsForRoles } from "../src/auth/roles.mjs";
import { createSeededPlatformState } from "../src/dashboard/state.mjs";
import { D1PlatformDatabase, MemoryD1Binding } from "../src/persistence/database.mjs";
import { applyAllMigrations } from "../src/persistence/migrations.mjs";
import { createPlatformServices } from "../src/persistence/services.mjs";

const identityEnv = {
  APP_ENV: "test",
  SESSION_SECRET: "test-session-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_AUDIENCE: "maxxed-platform",
  TRUSTED_IDENTITY_ISSUER: "https://maxxed.cloudflareaccess.com",
  TRUSTED_IDENTITY_JWT_KEY: "identity-jwt-test-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_JWT_ALGORITHM: "HS256",
  RUNNER_API_TOKEN: "test-runner-api-token-value-at-least-thirty-two",
};

function actor(email, roles) {
  return {
    email,
    subject: `sub:${email}`,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", identityEnv.TRUSTED_IDENTITY_JWT_KEY).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function authHeaders(email, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt({
    iss: identityEnv.TRUSTED_IDENTITY_ISSUER,
    aud: identityEnv.TRUSTED_IDENTITY_AUDIENCE,
    sub: `sub:${email}`,
    email,
    name: email.split("@")[0],
    exp: now + 3600,
    iat: now,
  });
  return {
    "cf-access-jwt-assertion": jwt,
    "cf-access-authenticated-user-email": email,
    "cf-access-authenticated-user-id": `sub:${email}`,
    "cf-access-authenticated-user-name": email.split("@")[0],
    ...overrides,
  };
}

async function session(app, email) {
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/knowledge-base", {
    headers: authHeaders(email),
  }));
  const body = await response.text();
  return {
    response,
    cookie: response.headers.get("set-cookie"),
    csrf: /<code data-csrf-token>([^<]+)<\/code>/.exec(body)?.[1],
    body,
  };
}

async function post(app, email, sessionState, path, payload = {}) {
  return app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    method: "POST",
    headers: authHeaders(email, {
      cookie: sessionState.cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": sessionState.csrf,
    }),
    body: JSON.stringify(payload),
  }));
}

const draftPayload = {
  slug: "secure-release-runbook",
  title: "<Release> Runbook",
  body: "# Release\n<script>alert(1)</script>",
  section: "release",
  classification: "internal",
  audience: "engineering",
  productId: "maxxed-remote",
  changeSummary: "Add production rollback validation.",
};

test("knowledge base UI enforces draft, review, separate approval, publication, and archive", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const docs = await session(app, "docs@techmaxxed.com");
  assert.equal(docs.response.status, 200);
  assert.match(docs.body, /knowledge-base-form/);
  assert.match(docs.body, /data-kb-submit/);
  assert.doesNotMatch(docs.body, /<script>alert\(1\)<\/script>/);

  const script = await app.fetch(new Request("https://admin.techmaxxed.com/knowledge-base.js", {
    headers: authHeaders("docs@techmaxxed.com"),
  }));
  assert.equal(script.status, 200);
  const scriptBody = await script.text();
  assert.doesNotThrow(() => new Function(scriptBody));
  assert.match(scriptBody, /data-kb-publish/);
  assert.match(scriptBody, /x-csrf-token/);

  const createdResponse = await post(app, "docs@techmaxxed.com", docs, "/knowledge-base/drafts", draftPayload);
  assert.equal(createdResponse.status, 200);
  const created = (await createdResponse.json()).record;
  assert.equal(created.workflow_state, "draft");
  assert.equal(created.revision_number, 1);

  const submittedResponse = await post(app, "docs@techmaxxed.com", docs, `/knowledge-base/revisions/${created.id}/submit`);
  assert.equal(submittedResponse.status, 200);
  assert.equal((await submittedResponse.json()).record.workflow_state, "in_review");

  const selfPublish = await post(app, "docs@techmaxxed.com", docs, `/knowledge-base/revisions/${created.id}/publish`);
  assert.equal(selfPublish.status, 409);
  assert.equal((await selfPublish.json()).error, "knowledge_base_approval_conflict:self_approval");

  const admin = await session(app, "admin@techmaxxed.com");
  const publishedResponse = await post(app, "admin@techmaxxed.com", admin, `/knowledge-base/revisions/${created.id}/publish`);
  assert.equal(publishedResponse.status, 200);
  const published = (await publishedResponse.json()).record;
  assert.equal(published.workflow_state, "published");
  assert.equal(published.reviewer_email, "admin@techmaxxed.com");

  const page = await session(app, "docs@techmaxxed.com");
  assert.match(page.body, /&lt;Release&gt; Runbook/);
  assert.match(page.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(page.body, /<script>alert\(1\)<\/script>/);

  const entries = await state.database.transaction((tx) => tx.list("knowledge_base_entries"));
  const entry = entries.find((item) => item.slug === draftPayload.slug);
  assert.equal(entry.publication_state, "internal");
  assert.equal(entry.body, draftPayload.body);

  const archivedResponse = await post(app, "admin@techmaxxed.com", admin, `/knowledge-base/entries/${entry.id}/archive`);
  assert.equal(archivedResponse.status, 200);
  assert.equal((await archivedResponse.json()).record.publication_state, "archived");

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.deepEqual(
    audit.filter((event) => event.target_type.includes("knowledge_base")).slice(-4).map((event) => event.action_name),
    ["knowledge_base_revision.create", "knowledge_base_revision.submit", "knowledge_base_revision.publish", "knowledge_base.archive"],
  );
});

test("knowledge base validates public scope, permissions, immutable revisions, and state transitions", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const developer = await session(app, "developer@techmaxxed.com");

  const invalid = await post(app, "developer@techmaxxed.com", developer, "/knowledge-base/drafts", {
    ...draftPayload,
    slug: "public-mismatch",
    classification: "public",
    audience: "internal",
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "invalid_knowledge_base_public_scope");

  const first = await post(app, "developer@techmaxxed.com", developer, "/knowledge-base/drafts", draftPayload);
  assert.equal(first.status, 200);
  const second = await post(app, "developer@techmaxxed.com", developer, "/knowledge-base/drafts", {
    ...draftPayload,
    body: "Second revision",
    changeSummary: "Refine the rollback section.",
  });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).record.revision_number, 2);

  const revisions = await state.database.transaction((tx) => tx.list("knowledge_base_revisions"));
  const matching = revisions.filter((revision) => revision.entry_id === revisions.find((revision) => revision.title === draftPayload.title)?.entry_id);
  assert.equal(matching.length >= 2, true);
  assert.equal(matching.some((revision) => revision.body === draftPayload.body), true);
  assert.equal(matching.some((revision) => revision.body === "Second revision"), true);

  const firstRecord = (await first.clone().json()).record;
  const forbiddenPublish = await post(app, "developer@techmaxxed.com", developer, `/knowledge-base/revisions/${firstRecord.id}/publish`);
  assert.equal(forbiddenPublish.status, 403);
});

test("D1 persists knowledge revisions and rejects invalid transition ordering", async () => {
  const binding = new MemoryD1Binding();
  const database = new D1PlatformDatabase(binding);
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const author = actor("author@techmaxxed.com", [ROLES.DEVELOPER]);
  const publisher = actor("publisher@techmaxxed.com", [ROLES.ADMINISTRATOR]);

  const revision = await services.saveKnowledgeBaseDraft({ actor: author, requestId: "kb-d1-create" }, {
    ...draftPayload,
    slug: "d1-release-runbook",
  });
  await assert.rejects(
    () => services.publishKnowledgeBaseRevision({ actor: publisher, requestId: "kb-d1-early" }, { revisionId: revision.id }),
    /knowledge_base_state_conflict:revision_not_in_review/,
  );
  await services.submitKnowledgeBaseRevision({ actor: author, requestId: "kb-d1-submit" }, { revisionId: revision.id });
  await services.publishKnowledgeBaseRevision({ actor: publisher, requestId: "kb-d1-publish" }, { revisionId: revision.id });

  const revisions = (await binding.prepare('SELECT * FROM "knowledge_base_revisions" ORDER BY created_at ASC, id ASC').all()).results;
  const entries = (await binding.prepare('SELECT * FROM "knowledge_base_entries" ORDER BY created_at ASC, id ASC').all()).results;
  assert.equal(revisions.length, 1);
  assert.equal(revisions[0].workflow_state, "published");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].publication_state, "internal");
  assert.equal(entries[0].body, draftPayload.body);
});
