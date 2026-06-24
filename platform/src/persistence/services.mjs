import { hasPermission, PERMISSIONS } from "../auth/roles.mjs";
import { AuditEventRepository } from "./audit.mjs";
import { createRepositories } from "./repositories.mjs";
import { TERMINAL_JOB_STATES } from "../testing/catalog.mjs";

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
    assignRole(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.USERS_MANAGE,
        action: "role.assign",
        targetType: "role_assignment",
        requestId: context.requestId,
        mutation: async (tx, now) => ({
          after: await repositories.roleAssignments.insert(tx, makeRecord("role", {
            user_id: requireString(payload.userId, "invalid_user_id"),
            role_name: requireString(payload.roleName, "invalid_role_name"),
            assigned_by: context.actor.email,
            created_at: now,
          }), now),
        }),
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
        mutation: async (tx, now) => ({
          after: await repositories.automationJobs.insert(tx, makeRecord("job", {
            product_id: requireString(payload.productId, "invalid_product_id"),
            ordered_steps_json: JSON.stringify(requireArray(payload.orderedSteps ?? [], "invalid_ordered_steps")),
            device_id: requireString(payload.deviceId, "invalid_device_id"),
            runner_id: requireString(payload.runnerId, "invalid_runner_id"),
            lease_state: requireString(payload.leaseState, "invalid_lease_state"),
            result_json: JSON.stringify(payload.result ?? {}),
            evidence_json: JSON.stringify(payload.evidence ?? []),
          }), now),
        }),
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
          return {
            before,
            after: await repositories.automationJobs.insert(tx, makeRecord("job", {
              product_id: before.product_id,
              ordered_steps_json: JSON.stringify(orderedSteps),
              device_id: before.device_id,
              runner_id: before.runner_id,
              lease_state: "queued",
              result_json: JSON.stringify({ retryOfJobId: before.id }),
              evidence_json: "[]",
            }), now),
          };
        },
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
          const jobs = await repositories.automationJobs.list(tx);
          const before = jobs.find((job) =>
            job.lease_state === "queued" &&
            job.runner_id === runnerId &&
            job.device_id === deviceId
          );
          if (!before) throw new Error("missing_row:automation_job");
          return {
            before,
            after: await repositories.automationJobs.update(tx, before.id, {
              lease_state: "running",
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
              result_json: JSON.stringify(payload.result ?? {}),
              evidence_json: JSON.stringify(requireArray(payload.evidence ?? [], "invalid_job_evidence")),
            }, now),
          };
        },
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
