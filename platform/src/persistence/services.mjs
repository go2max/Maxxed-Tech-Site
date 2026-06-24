import { hasPermission, PERMISSIONS, ROLES } from "../auth/roles.mjs";
import { AuditEventRepository } from "./audit.mjs";
import { createRepositories } from "./repositories.mjs";
import { getTestingProduct, TERMINAL_JOB_STATES } from "../testing/catalog.mjs";

function requirePermission(identity, permission) {
  if (!hasPermission(identity, permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}

function requireString(value, code) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(code);
  }
  return value.trim();
}

function requireEmail(value) {
  const email = requireString(value, "invalid_user_email").toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("invalid_user_email");
  }
  return email;
}

function currentRoles(userId, legacyAssignments, roleEvents) {
  const states = new Map();
  for (const assignment of legacyAssignments) {
    if (assignment.user_id === userId) states.set(assignment.role_name, "grant");
  }
  for (const event of roleEvents) {
    if (event.user_id === userId) states.set(event.role_name, event.action);
  }
  return [...states.entries()].filter(([, action]) => action === "grant").map(([role]) => role);
}

function requireArray(value, code) {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
}

function optionalString(value, maximumLength, code) {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > maximumLength) throw new Error(code);
  return value.trim();
}

function parseObjectJson(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function executionTarget(payload) {
  const runnerId = requireString(payload.runnerId, "invalid_runner_id");
  const deviceId = requireString(payload.deviceId, "invalid_device_id");
  const safeId = /^[A-Za-z0-9._:-]{1,80}$/;
  if (!safeId.test(runnerId) || !safeId.test(deviceId)) throw new Error("invalid_execution_target");
  if ((runnerId === "auto") !== (deviceId === "auto")) throw new Error("invalid_execution_target");
  return { runnerId, deviceId, targetMode: runnerId === "auto" ? "pool" : "exact" };
}

function nowIso(now) {
  return new Date(now).toISOString();
}

function makeRecord(prefix, attributes = {}) {
  return {
    id: `${prefix}-${crypto.randomUUID()}`,
    ...attributes,
  };
}

async function appendAuditEvent(auditRepository, tx, { actor, action, targetType, requestId, before, after, createdAt }) {
  await auditRepository.append(tx, {
    id: `audit-${crypto.randomUUID()}`,
    actor_email: actor.email,
    actor_roles_json: JSON.stringify(actor.roles),
    trusted_subject: actor.subject,
    request_id: requestId,
    action_name: action,
    target_type: targetType,
    target_id: after.id,
    outcome: "success",
    before_json: JSON.stringify(before),
    after_json: JSON.stringify(after),
    created_at: createdAt,
  });
}

export function createPlatformServices(database) {
  const repositories = createRepositories();
  const auditRepository = new AuditEventRepository();

  async function auditedMutation({ actor, permission, action, targetType, requestId, mutation }) {
    requirePermission(actor, permission);
    const now = Date.now();
    const createdAt = nowIso(now);
    return database.transaction(async (tx) => {
      const { before = null, after } = await mutation(tx, createdAt);
      await appendAuditEvent(auditRepository, tx, { actor, action, targetType, requestId, before, after, createdAt });
      return after;
    });
  }

  return {
    repositories,
    auditRepository,
    createUser(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.USERS_MANAGE,
        action: "user.create",
        targetType: "user",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const email = requireEmail(payload.email);
          const displayName = requireString(payload.displayName, "invalid_user_display_name");
          if (displayName.length > 100) throw new Error("invalid_user_display_name");
          const status = payload.status || "active";
          if (!["active", "inactive"].includes(status)) throw new Error("invalid_user_status");
          const existing = (await repositories.users.list(tx))
            .find((user) => user.email.toLowerCase() === email);
          if (existing) throw new Error("access_state_conflict:user_exists");
          return {
            after: await repositories.users.insert(tx, makeRecord("user", {
              email,
              display_name: displayName,
              status,
            }), now),
          };
        },
      });
    },
    assignRole(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.USERS_MANAGE,
        action: "role.assign",
        targetType: "access_role_event",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const userId = requireString(payload.userId, "invalid_user_id");
          const roleName = requireString(payload.roleName, "invalid_role_name");
          if (!Object.values(ROLES).includes(roleName)) throw new Error("invalid_role_name");
          const user = await repositories.users.get(tx, userId);
          if (!user) throw new Error("missing_row:user");
          const roles = currentRoles(
            userId,
            await repositories.roleAssignments.list(tx),
            await repositories.accessRoleEvents.list(tx),
          );
          if (roles.includes(roleName)) throw new Error("access_state_conflict:role_already_granted");
          return {
            after: await repositories.accessRoleEvents.insert(tx, makeRecord("role-event", {
              user_id: userId,
              role_name: roleName,
              action: "grant",
              assigned_by: context.actor.email,
            }), now),
          };
        },
      });
    },
    revokeRole(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.USERS_MANAGE,
        action: "role.revoke",
        targetType: "access_role_event",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const userId = requireString(payload.userId, "invalid_user_id");
          const roleName = requireString(payload.roleName, "invalid_role_name");
          if (!Object.values(ROLES).includes(roleName)) throw new Error("invalid_role_name");
          const users = await repositories.users.list(tx);
          const user = users.find((record) => record.id === userId);
          if (!user) throw new Error("missing_row:user");
          const legacy = await repositories.roleAssignments.list(tx);
          const events = await repositories.accessRoleEvents.list(tx);
          const roles = currentRoles(userId, legacy, events);
          if (!roles.includes(roleName)) throw new Error("access_state_conflict:role_not_granted");
          if (roleName === ROLES.OWNER && user.status === "active") {
            const activeOwners = users.filter((candidate) =>
              candidate.status === "active" &&
              currentRoles(candidate.id, legacy, events).includes(ROLES.OWNER)
            );
            if (activeOwners.length <= 1) throw new Error("access_safety_conflict:last_active_owner");
          }
          return {
            after: await repositories.accessRoleEvents.insert(tx, makeRecord("role-event", {
              user_id: userId,
              role_name: roleName,
              action: "revoke",
              assigned_by: context.actor.email,
            }), now),
          };
        },
      });
    },
    updateUserStatus(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.USERS_MANAGE,
        action: "user.status_update",
        targetType: "user",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const userId = requireString(payload.userId, "invalid_user_id");
          const status = requireString(payload.status, "invalid_user_status");
          if (!["active", "inactive"].includes(status)) throw new Error("invalid_user_status");
          const users = await repositories.users.list(tx);
          const before = users.find((record) => record.id === userId);
          if (!before) throw new Error("missing_row:user");
          if (before.status === status) throw new Error("access_state_conflict:status_unchanged");
          if (status === "inactive") {
            const legacy = await repositories.roleAssignments.list(tx);
            const events = await repositories.accessRoleEvents.list(tx);
            if (currentRoles(userId, legacy, events).includes(ROLES.OWNER)) {
              const activeOwners = users.filter((candidate) =>
                candidate.status === "active" &&
                currentRoles(candidate.id, legacy, events).includes(ROLES.OWNER)
              );
              if (activeOwners.length <= 1) throw new Error("access_safety_conflict:last_active_owner");
            }
          }
          return {
            before,
            after: await repositories.users.update(tx, userId, { status }, now),
          };
        },
      });
    },
    createProduct(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.PRODUCTS_WRITE,
        action: "product.create",
        targetType: "product",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.products.insert(tx, makeRecord("product", {
            slug: requireString(payload.slug, "invalid_product_slug"),
            name: requireString(payload.name, "invalid_product_name"),
            package_id: requireString(payload.packageId, "invalid_package_id"),
            lifecycle_status: requireString(payload.lifecycleStatus, "invalid_lifecycle_status"),
          }), now),
        }),
      });
    },
    recordBuild(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_PREPARE,
        action: "build.record",
        targetType: "build",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.builds.insert(tx, makeRecord("build", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            version_name: requireString(payload.versionName, "invalid_version_name"),
            version_code: Number(payload.versionCode),
            artifact_sha256: requireString(payload.artifactSha256, "invalid_artifact_sha256"),
            signer_fingerprint: requireString(payload.signerFingerprint, "invalid_signer_fingerprint"),
            signing_metadata: JSON.stringify(payload.signingMetadata ?? {}),
          }), now),
        }),
      });
    },
    createRelease(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_PREPARE,
        action: "release.create",
        targetType: "release",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.releases.insert(tx, makeRecord("release", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            build_id: requireString(payload.buildId, "invalid_build_id"),
            stage: requireString(payload.stage, "invalid_release_stage"),
            qa_approval_state: requireString(payload.qaApprovalState, "invalid_qa_state"),
            owner_approval_state: requireString(payload.ownerApprovalState, "invalid_owner_state"),
            release_notes: requireString(payload.releaseNotes, "invalid_release_notes"),
            blockers_json: JSON.stringify(requireArray(payload.blockers ?? [], "invalid_release_blockers")),
          }), now),
        }),
      });
    },
    approveReleaseQa(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_APPROVE_QA,
        action: "release.qa_approve",
        targetType: "release",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const releaseId = requireString(payload.releaseId, "invalid_release_id");
          const before = await repositories.releases.get(tx, releaseId);
          if (!before) throw new Error(`missing_row:releases:${releaseId}`);
          const after = await repositories.releases.update(tx, releaseId, {
            qa_approval_state: "approved",
            release_notes: requireString(payload.releaseNotes || before.release_notes, "invalid_release_notes"),
          }, now);
          return { before, after };
        },
      });
    },
    promoteReleaseToProduction(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_PROMOTE_PRODUCTION,
        action: "release.promote_production",
        targetType: "release",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const releaseId = requireString(payload.releaseId, "invalid_release_id");
          const before = await repositories.releases.get(tx, releaseId);
          if (!before) throw new Error(`missing_row:releases:${releaseId}`);
          const blockers = JSON.parse(before.blockers_json || "[]");
          if (before.qa_approval_state !== "approved") throw new Error("release_gate_failed:qa_approval_required");
          if (before.owner_approval_state === "approved") throw new Error("release_gate_failed:already_promoted");
          if (blockers.length > 0) throw new Error("release_gate_failed:blockers_present");
          if (payload.confirmation !== "PROMOTE") throw new Error("release_gate_failed:confirmation_required");
          const after = await repositories.releases.update(tx, releaseId, {
            stage: "production",
            owner_approval_state: "approved",
            release_notes: requireString(payload.releaseNotes || before.release_notes, "invalid_release_notes"),
          }, now);
          return { before, after };
        },
      });
    },
    createQaPlan(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "qa_plan.create",
        targetType: "qa_plan",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.qaPlans.insert(tx, makeRecord("qaplan", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            version_label: requireString(payload.versionLabel, "invalid_version_label"),
            assignments_json: JSON.stringify(requireArray(payload.assignments ?? [], "invalid_assignments")),
            test_cases_json: JSON.stringify(requireArray(payload.testCases ?? [], "invalid_test_cases")),
          }), now),
        }),
      });
    },
    recordQaExecution(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "qa_execution.record",
        targetType: "qa_execution",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.qaExecutions.insert(tx, makeRecord("qaexec", {
            qa_plan_id: requireString(payload.qaPlanId, "invalid_qa_plan_id"),
            assignee_email: requireString(payload.assigneeEmail, "invalid_assignee_email"),
            result_state: requireString(payload.resultState, "invalid_result_state"),
            evidence_json: JSON.stringify(requireArray(payload.evidence ?? [], "invalid_evidence")),
          }), now),
        }),
      });
    },
    reportBug(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "bug.report",
        targetType: "bug",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.bugs.insert(tx, makeRecord("bug", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            severity: requireString(payload.severity, "invalid_bug_severity"),
            priority: requireString(payload.priority, "invalid_bug_priority"),
            status: requireString(payload.status, "invalid_bug_status"),
            owner_email: requireString(payload.ownerEmail, "invalid_bug_owner_email"),
            verification_json: JSON.stringify(payload.verification ?? {}),
          }), now),
        }),
      });
    },
    reviewBetaApplication(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.BETA_REVIEW,
        action: "beta_application.review",
        targetType: "beta_application",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const applicationId = payload.applicationId ? requireString(payload.applicationId, "invalid_beta_application_id") : null;
          const before = applicationId ? await repositories.betaApplications.get(tx, applicationId) : null;
          if (applicationId && !before) throw new Error(`missing_row:beta_applications:${applicationId}`);
          if (before) {
            const after = await repositories.betaApplications.update(tx, applicationId, {
              status: requireString(payload.status, "invalid_beta_status"),
              credits_json: JSON.stringify(payload.credits ?? JSON.parse(before.credits_json || "{}")),
              consent_json: JSON.stringify(payload.consent ?? JSON.parse(before.consent_json || "{}")),
            }, now);
            return { before, after };
          }
          return {
            after: await repositories.betaApplications.insert(tx, makeRecord("beta", {
              email: requireString(payload.email, "invalid_beta_email").toLowerCase(),
              device_json: JSON.stringify(payload.device ?? {}),
              interests_json: JSON.stringify(requireArray(payload.interests ?? [], "invalid_beta_interests")),
              status: requireString(payload.status, "invalid_beta_status"),
              credits_json: JSON.stringify(payload.credits ?? {}),
              consent_json: JSON.stringify(payload.consent ?? {}),
            }), now),
          };
        },
      });
    },
    recordBetaFeedback(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.BETA_PORTAL,
        action: "beta_feedback.record",
        targetType: "beta_feedback",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.betaFeedback.insert(tx, makeRecord("feedback", {
            beta_application_id: payload.betaApplicationId || null,
            email: requireString(payload.email, "invalid_feedback_email").toLowerCase(),
            product_slug: requireString(payload.productSlug, "invalid_feedback_product_slug"),
            feedback: requireString(payload.feedback, "invalid_feedback_body"),
          }), now),
        }),
      });
    },
    createAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "automation_job.create",
        targetType: "automation_job",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const target = executionTarget(payload);
          return {
            after: await repositories.automationJobs.insert(tx, makeRecord("job", {
              product_id: requireString(payload.productId, "invalid_product_id"),
              ordered_steps_json: JSON.stringify(requireArray(payload.orderedSteps ?? [], "invalid_ordered_steps")),
              device_id: target.deviceId,
              runner_id: target.runnerId,
              lease_state: requireString(payload.leaseState, "invalid_lease_state"),
              result_json: JSON.stringify({ ...(payload.result ?? {}), targetMode: target.targetMode }),
              evidence_json: JSON.stringify(payload.evidence ?? []),
            }), now),
          };
        },
      });
    },
    cancelAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "automation_job.cancel",
        targetType: "automation_job",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const jobId = requireString(payload.jobId, "invalid_job_id");
          const productId = requireString(payload.productId, "invalid_product_id");
          const before = await repositories.automationJobs.get(tx, jobId);
          if (!before || before.product_id !== productId) throw new Error("missing_row:automation_job");
          if (!["queued", "running"].includes(before.lease_state)) {
            throw new Error("job_state_conflict:cancel_requires_active");
          }
          const reason = optionalString(payload.reason, 240, "invalid_cancel_reason");
          const currentResult = parseObjectJson(before.result_json);
          const cancelling = before.lease_state === "running";
          return {
            before,
            after: await repositories.automationJobs.update(tx, before.id, {
              lease_state: cancelling ? "cancelling" : "cancelled",
              result_json: JSON.stringify({
                ...currentResult,
                finalStatus: cancelling ? "cancelling" : "cancelled",
                cancellationRequested: true,
                ...(reason ? { reason } : {}),
              }),
              ...(cancelling ? {} : { evidence_json: "[]" }),
            }, now),
          };
        },
      });
    },
    retryAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "automation_job.retry",
        targetType: "automation_job",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const jobId = requireString(payload.jobId, "invalid_job_id");
          const productId = requireString(payload.productId, "invalid_product_id");
          const before = await repositories.automationJobs.get(tx, jobId);
          if (!before || before.product_id !== productId) throw new Error("missing_row:automation_job");
          if (!TERMINAL_JOB_STATES.includes(before.lease_state)) {
            throw new Error("job_state_conflict:retry_requires_terminal");
          }
          let orderedSteps;
          try {
            orderedSteps = requireArray(JSON.parse(before.ordered_steps_json), "invalid_ordered_steps");
          } catch {
            throw new Error("invalid_ordered_steps");
          }
          const previousResult = parseObjectJson(before.result_json);
          const pooled = previousResult.targetMode === "pool";
          return {
            before,
            after: await repositories.automationJobs.insert(tx, makeRecord("job", {
              product_id: before.product_id,
              ordered_steps_json: JSON.stringify(orderedSteps),
              device_id: pooled ? "auto" : before.device_id,
              runner_id: pooled ? "auto" : before.runner_id,
              lease_state: "queued",
              result_json: JSON.stringify({ retryOfJobId: before.id, targetMode: pooled ? "pool" : "exact" }),
              evidence_json: "[]",
            }), now),
          };
        },
      });
    },
    recordRunnerHeartbeat(context, payload) {
      requirePermission(context.actor, PERMISSIONS.QA_EXECUTE);
      const runnerId = requireString(payload.runnerId, "invalid_runner_id");
      const deviceId = requireString(payload.deviceId, "invalid_device_id");
      const productIds = requireArray(payload.productIds ?? ["maxxed-remote"], "invalid_runner_products");
      const uniqueProductIds = [...new Set(productIds)];
      if (uniqueProductIds.length === 0 || uniqueProductIds.length > 20 ||
          uniqueProductIds.length !== productIds.length ||
          uniqueProductIds.some((productId) => typeof productId !== "string" || !getTestingProduct(productId))) {
        throw new Error("invalid_runner_products");
      }
      const agentVersion = optionalString(payload.agentVersion || "legacy", 40, "invalid_agent_version");
      if (!/^[A-Za-z0-9._+-]{1,40}$/.test(agentVersion)) throw new Error("invalid_agent_version");
      return database.transaction(async (tx) => {
        const now = new Date().toISOString();
        const id = `runner-node:${runnerId}:${deviceId}`;
        const existing = await repositories.runnerNodes.get(tx, id);
        const attributes = {
          runner_id: runnerId,
          device_id: deviceId,
          product_ids_json: JSON.stringify(uniqueProductIds),
          agent_version: agentVersion,
          last_seen_at: now,
        };
        return existing
          ? repositories.runnerNodes.update(tx, id, attributes, now)
          : repositories.runnerNodes.insert(tx, { id, ...attributes }, now);
      });
    },
    heartbeatAutomationJob(context, payload) {
      requirePermission(context.actor, PERMISSIONS.QA_EXECUTE);
      return database.transaction(async (tx) => {
        const jobId = requireString(payload.jobId, "invalid_job_id");
        const runnerId = requireString(payload.runnerId, "invalid_runner_id");
        const before = await repositories.automationJobs.get(tx, jobId);
        if (!before) throw new Error("missing_row:automation_job");
        if (before.runner_id !== runnerId || !["running", "cancelling"].includes(before.lease_state)) {
          throw new Error("forbidden:automation_job_lease");
        }
        const progress = payload.progress == null ? null : {
          stepId: optionalString(payload.progress.stepId, 80, "invalid_job_progress"),
          completedSteps: Math.max(0, Math.min(100, Number(payload.progress.completedSteps) || 0)),
        };
        return repositories.automationJobs.update(tx, before.id, {
          result_json: JSON.stringify({
            ...parseObjectJson(before.result_json),
            ...(progress ? { progress } : {}),
            heartbeatAt: new Date().toISOString(),
          }),
        }, new Date().toISOString());
      });
    },
    async expireAutomationLeases(context, payload) {
      requirePermission(context.actor, PERMISSIONS.QA_EXECUTE);
      const runnerId = requireString(payload.runnerId, "invalid_runner_id");
      const deviceId = requireString(payload.deviceId, "invalid_device_id");
      const cutoff = new Date(payload.cutoff).getTime();
      if (!Number.isFinite(cutoff)) throw new Error("invalid_lease_cutoff");
      const candidates = await database.transaction(async (tx) =>
        (await repositories.automationJobs.list(tx))
          .filter((job) =>
            job.runner_id === runnerId &&
            job.device_id === deviceId &&
            ["running", "cancelling"].includes(job.lease_state) &&
            new Date(job.updated_at).getTime() < cutoff
          )
          .map((job) => job.id)
      );
      const expired = [];
      for (const jobId of candidates) {
        const record = await database.transaction(async (tx) => {
          const before = await repositories.automationJobs.get(tx, jobId);
          if (!before ||
              !["running", "cancelling"].includes(before.lease_state) ||
              new Date(before.updated_at).getTime() >= cutoff) {
            return null;
          }
          const now = new Date().toISOString();
          const after = await repositories.automationJobs.update(tx, before.id, {
            lease_state: "interrupted",
            result_json: JSON.stringify({
              ...parseObjectJson(before.result_json),
              finalStatus: "interrupted",
              error: "runner_lease_expired",
            }),
          }, now);
          await appendAuditEvent(auditRepository, tx, {
            actor: context.actor,
            action: "automation_job.expire",
            targetType: "automation_job",
            requestId: context.requestId,
            before,
            after,
            createdAt: now,
          });
          return after;
        });
        if (record) expired.push(record);
      }
      return expired;
    },
    claimAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "automation_job.claim",
        targetType: "automation_job",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const runnerId = requireString(payload.runnerId, "invalid_runner_id");
          const deviceId = requireString(payload.deviceId, "invalid_device_id");
          const productIds = requireArray(payload.productIds ?? ["maxxed-remote"], "invalid_runner_products");
          if (productIds.length === 0 || productIds.length > 20 ||
              productIds.some((productId) => typeof productId !== "string" || !/^[A-Za-z0-9._:-]{1,80}$/.test(productId))) {
            throw new Error("invalid_runner_products");
          }
          const supportedProducts = new Set(productIds);
          if (supportedProducts.size !== productIds.length ||
              [...supportedProducts].some((productId) => !getTestingProduct(productId))) {
            throw new Error("invalid_runner_products");
          }
          const jobs = await repositories.automationJobs.list(tx);
          const active = jobs.find((job) =>
            job.runner_id === runnerId &&
            job.device_id === deviceId &&
            ["running", "cancelling"].includes(job.lease_state)
          );
          if (active) throw new Error("runner_capacity_conflict:device_busy");
          const compatible = (job) => job.lease_state === "queued" && supportedProducts.has(job.product_id);
          const exact = jobs.find((job) =>
            compatible(job) && job.runner_id === runnerId && job.device_id === deviceId
          );
          const pooled = jobs.find((job) =>
            compatible(job) && job.runner_id === "auto" && job.device_id === "auto"
          );
          const before = exact || pooled;
          if (!before) throw new Error("missing_row:automation_job");
          const currentResult = parseObjectJson(before.result_json);
          return {
            before,
            after: await repositories.automationJobs.update(tx, before.id, {
              runner_id: runnerId,
              device_id: deviceId,
              lease_state: "running",
              result_json: JSON.stringify({
                ...currentResult,
                targetMode: before.runner_id === "auto" ? "pool" : (currentResult.targetMode || "exact"),
                assignedRunnerId: runnerId,
                assignedDeviceId: deviceId,
                assignedAt: now,
              }),
            }, now),
          };
        },
      });
    },
    completeAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "automation_job.complete",
        targetType: "automation_job",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const jobId = requireString(payload.jobId, "invalid_job_id");
          const runnerId = requireString(payload.runnerId, "invalid_runner_id");
          const before = await repositories.automationJobs.get(tx, jobId);
          if (!before) throw new Error("missing_row:automation_job");
          if (before.runner_id !== runnerId || !["running", "cancelling"].includes(before.lease_state)) {
            throw new Error("forbidden:automation_job_lease");
          }
          const status = requireString(payload.status, "invalid_job_status");
          if (![...TERMINAL_JOB_STATES].includes(status)) {
            throw new Error("invalid_job_status");
          }
          return {
            before,
            after: await repositories.automationJobs.update(tx, before.id, {
              lease_state: status,
              result_json: JSON.stringify({
                ...parseObjectJson(before.result_json),
                ...(payload.result ?? {}),
              }),
              evidence_json: JSON.stringify(requireArray(payload.evidence ?? [], "invalid_job_evidence")),
            }, now),
          };
        },
      });
    },
    prepareEvidenceUpload(context, payload) {
      requirePermission(context.actor, PERMISSIONS.QA_EXECUTE);
      const jobId = requireString(payload.jobId, "invalid_job_id");
      const runnerId = requireString(payload.runnerId, "invalid_runner_id");
      const stepId = requireString(payload.stepId, "invalid_evidence_step_id");
      const artifactName = requireString(payload.artifactName, "invalid_evidence_name");
      if (!/^[A-Za-z0-9._:-]{1,80}$/.test(stepId) ||
          !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(artifactName)) {
        throw new Error("invalid_evidence_identity");
      }
      return database.transaction(async (tx) => {
        const job = await repositories.automationJobs.get(tx, jobId);
        if (!job) throw new Error("missing_row:automation_job");
        if (job.runner_id !== runnerId || !["running", "cancelling"].includes(job.lease_state)) {
          throw new Error("forbidden:automation_job_lease");
        }
        const id = `evidence-${crypto.randomUUID()}`;
        return {
          id,
          jobId,
          stepId,
          artifactName,
          objectKey: `jobs/${jobId}/${id}/${artifactName}`,
        };
      });
    },
    recordEvidenceObject(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "test_evidence.create",
        targetType: "test_evidence_object",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const jobId = requireString(payload.jobId, "invalid_job_id");
          const runnerId = requireString(payload.runnerId, "invalid_runner_id");
          const job = await repositories.automationJobs.get(tx, jobId);
          if (!job) throw new Error("missing_row:automation_job");
          if (job.runner_id !== runnerId || !["running", "cancelling"].includes(job.lease_state)) {
            throw new Error("forbidden:automation_job_lease");
          }
          const byteSize = Number(payload.byteSize);
          if (!Number.isSafeInteger(byteSize) || byteSize < 0) throw new Error("invalid_evidence_size");
          const sha256 = requireString(payload.sha256, "invalid_evidence_sha256").toLowerCase();
          if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("invalid_evidence_sha256");
          const retentionUntil = requireString(payload.retentionUntil, "invalid_evidence_retention");
          if (!Number.isFinite(Date.parse(retentionUntil))) throw new Error("invalid_evidence_retention");
          return {
            after: await repositories.testEvidenceObjects.insert(tx, {
              id: requireString(payload.id, "invalid_evidence_id"),
              job_id: jobId,
              step_id: requireString(payload.stepId, "invalid_evidence_step_id"),
              artifact_name: requireString(payload.artifactName, "invalid_evidence_name"),
              object_key: requireString(payload.objectKey, "invalid_evidence_object_key"),
              content_type: requireString(payload.contentType, "invalid_evidence_content_type"),
              byte_size: byteSize,
              sha256,
              storage_state: "available",
              retention_until: retentionUntil,
            }, now),
          };
        },
      });
    },
    deleteEvidenceObject(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.SECURITY_MANAGE,
        action: "test_evidence.delete",
        targetType: "test_evidence_object",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const evidenceId = requireString(payload.evidenceId, "invalid_evidence_id");
          const before = await repositories.testEvidenceObjects.get(tx, evidenceId);
          if (!before) throw new Error("missing_row:test_evidence_object");
          if (before.storage_state !== "available") throw new Error("evidence_state_conflict:not_available");
          return {
            before,
            after: await repositories.testEvidenceObjects.update(tx, evidenceId, {
              storage_state: "deleted",
            }, now),
          };
        },
      });
    },
    createTestSchedule(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "test_schedule.create",
        targetType: "test_schedule",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const name = requireString(payload.name, "invalid_schedule_name");
          if (name.length > 80) throw new Error("invalid_schedule_name");
          const productIds = requireArray(payload.productIds, "invalid_schedule_products");
          const uniqueProductIds = [...new Set(productIds)];
          if (uniqueProductIds.length === 0 || uniqueProductIds.length !== productIds.length ||
              uniqueProductIds.some((productId) => !getTestingProduct(productId))) {
            throw new Error("invalid_schedule_products");
          }
          let target;
          try {
            target = executionTarget(payload);
          } catch {
            throw new Error("invalid_schedule_target");
          }
          const { runnerId, deviceId } = target;
          const cadenceMinutes = Number(payload.cadenceMinutes);
          if (!Number.isSafeInteger(cadenceMinutes) || cadenceMinutes < 15 || cadenceMinutes > 10080) {
            throw new Error("invalid_schedule_cadence");
          }
          const nextRunAt = requireString(payload.nextRunAt || now, "invalid_schedule_next_run");
          if (!Number.isFinite(Date.parse(nextRunAt))) throw new Error("invalid_schedule_next_run");
          return {
            after: await repositories.testSchedules.insert(tx, makeRecord("schedule", {
              name,
              product_ids_json: JSON.stringify(uniqueProductIds),
              runner_id: runnerId,
              device_id: deviceId,
              cadence_minutes: cadenceMinutes,
              enabled: 1,
              next_run_at: new Date(nextRunAt).toISOString(),
              last_run_at: null,
              created_by: context.actor.email,
            }), now),
          };
        },
      });
    },
    setTestScheduleEnabled(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "test_schedule.update",
        targetType: "test_schedule",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const scheduleId = requireString(payload.scheduleId, "invalid_schedule_id");
          const before = await repositories.testSchedules.get(tx, scheduleId);
          if (!before) throw new Error("missing_row:test_schedule");
          if (typeof payload.enabled !== "boolean") throw new Error("invalid_schedule_enabled");
          return {
            before,
            after: await repositories.testSchedules.update(tx, scheduleId, {
              enabled: payload.enabled ? 1 : 0,
              ...(payload.enabled && before.next_run_at < now ? { next_run_at: now } : {}),
            }, now),
          };
        },
      });
    },
    dispatchDueTestSchedules(context, payload = {}) {
      requirePermission(context.actor, PERMISSIONS.QA_ASSIGN);
      const requestedNow = payload.now == null ? new Date().toISOString() : requireString(payload.now, "invalid_schedule_now");
      if (!Number.isFinite(Date.parse(requestedNow))) throw new Error("invalid_schedule_now");
      const dispatchAt = new Date(requestedNow).toISOString();
      return database.transaction(async (tx) => {
        const due = (await repositories.testSchedules.list(tx))
          .filter((schedule) => Number(schedule.enabled) === 1 && schedule.next_run_at <= dispatchAt)
          .sort((left, right) => left.next_run_at.localeCompare(right.next_run_at))
          .slice(0, 20);
        const schedules = [];
        const jobs = [];
        for (const before of due) {
          const cadenceMs = Number(before.cadence_minutes) * 60_000;
          const previousRunMs = Date.parse(before.next_run_at);
          const overdueMs = Math.max(0, Date.parse(dispatchAt) - previousRunMs);
          const intervals = Math.floor(overdueMs / cadenceMs) + 1;
          const nextRunMs = previousRunMs + intervals * cadenceMs;
          const after = await repositories.testSchedules.update(tx, before.id, {
            last_run_at: dispatchAt,
            next_run_at: new Date(nextRunMs).toISOString(),
          }, dispatchAt);
          await appendAuditEvent(auditRepository, tx, {
            actor: context.actor,
            action: "test_schedule.dispatch",
            targetType: "test_schedule",
            requestId: context.requestId,
            before,
            after,
            createdAt: dispatchAt,
          });
          schedules.push(after);
          const productIds = JSON.parse(before.product_ids_json);
          for (const productId of productIds) {
            const product = getTestingProduct(productId);
            if (!product) throw new Error("invalid_schedule_products");
            const job = await repositories.automationJobs.insert(tx, makeRecord("job", {
              product_id: product.id,
              ordered_steps_json: JSON.stringify(product.orderedSteps),
              device_id: before.device_id,
              runner_id: before.runner_id,
              lease_state: "queued",
              result_json: JSON.stringify({
                packageId: product.packageId,
                targetMode: before.runner_id === "auto" ? "pool" : "exact",
                scheduleId: before.id,
                scheduledAt: dispatchAt,
              }),
              evidence_json: "[]",
            }), dispatchAt);
            await appendAuditEvent(auditRepository, tx, {
              actor: context.actor,
              action: "automation_job.create",
              targetType: "automation_job",
              requestId: context.requestId,
              before: null,
              after: job,
              createdAt: dispatchAt,
            });
            jobs.push(job);
          }
        }
        return { schedules, jobs, dispatchedAt: dispatchAt };
      });
    },
    createSupportCase(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.SUPPORT_CASES,
        action: "support_case.create",
        targetType: "support_case",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.supportCases.insert(tx, makeRecord("support", {
            email: requireString(payload.email, "invalid_support_email").toLowerCase(),
            subject: requireString(payload.subject, "invalid_support_subject"),
            status: requireString(payload.status, "invalid_support_status"),
            details: requireString(payload.details, "invalid_support_details"),
          }), now),
        }),
      });
    },
    recordIncident(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.INCIDENTS_WRITE,
        action: "incident.record",
        targetType: "incident",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.incidents.insert(tx, makeRecord("incident", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            severity: requireString(payload.severity, "invalid_incident_severity"),
            status: requireString(payload.status, "invalid_incident_status"),
            evidence_json: JSON.stringify(payload.evidence ?? []),
          }), now),
        }),
      });
    },
    updateIntegrationState(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.INTEGRATIONS_WRITE,
        action: "integration_state.record",
        targetType: "integration_state",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.integrationStates.insert(tx, makeRecord("integration", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            monitor_name: requireString(payload.monitorName, "invalid_monitor_name"),
            freshness_state: requireString(payload.freshnessState, "invalid_freshness_state"),
            details_json: JSON.stringify(payload.details ?? {}),
          }), now),
        }),
      });
    },
    publishKnowledgeBaseEntry(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.DOCS_PUBLISH,
        action: "knowledge_base.publish",
        targetType: "knowledge_base_entry",
        requestId: context.requestId,
        mutation: async (tx, now) => {
          const slug = requireString(payload.slug, "invalid_knowledge_base_slug");
          const existing = (await repositories.knowledgeBaseEntries.list(tx)).find((entry) => entry.slug === slug) ?? null;
          if (existing) {
            const after = await repositories.knowledgeBaseEntries.update(tx, existing.id, {
              title: requireString(payload.title, "invalid_knowledge_base_title"),
              publication_state: requireString(payload.publicationState, "invalid_knowledge_base_state"),
              body: requireString(payload.body, "invalid_knowledge_base_body"),
            }, now);
            return { before: existing, after };
          }
          return {
            after: await repositories.knowledgeBaseEntries.insert(tx, makeRecord("kb", {
              slug,
              title: requireString(payload.title, "invalid_knowledge_base_title"),
              publication_state: requireString(payload.publicationState, "invalid_knowledge_base_state"),
              body: requireString(payload.body, "invalid_knowledge_base_body"),
            }), now),
          };
        },
      });
    },
    recordReadinessSnapshot(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.READINESS_WRITE,
        action: "readiness_snapshot.record",
        targetType: "readiness_snapshot",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.readinessSnapshots.insert(tx, makeRecord("ready", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            score: Number(payload.score),
            mandatory_gates_json: JSON.stringify(payload.mandatoryGates ?? {}),
            evidence_json: JSON.stringify(payload.evidence ?? []),
          }), now),
        }),
      });
    },
  };
}
