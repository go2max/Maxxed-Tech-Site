import { hasPermission, PERMISSIONS } from "../auth/roles.mjs";
import { AuditEventRepository } from "./audit.mjs";
import { createRepositories } from "./repositories.mjs";

function requirePermission(identity, permission) {
  if (!hasPermission(identity, permission)) {
    throw new Error(`forbidden:${permission}`);
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

export function createPlatformServices(database) {
  const repositories = createRepositories();
  const auditRepository = new AuditEventRepository();

  async function auditedMutation({ actor, permission, action, targetType, before = null, afterFactory, requestId }) {
    requirePermission(actor, permission);
    const now = Date.now();
    return database.transaction(async (tx) => {
      const after = await afterFactory(tx, nowIso(now));
      auditRepository.append(tx, {
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
        created_at: nowIso(now),
      });
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
        afterFactory: (tx, now) => repositories.roleAssignments.insert(tx, makeRecord("role", {
          user_id: payload.userId,
          role_name: payload.roleName,
          assigned_by: context.actor.email,
          created_at: now,
        }), now),
      });
    },
    createProduct(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.PRODUCTS_WRITE,
        action: "product.create",
        targetType: "product",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.products.insert(tx, makeRecord("product", {
          slug: payload.slug,
          name: payload.name,
          package_id: payload.packageId,
          lifecycle_status: payload.lifecycleStatus,
        }), now),
      });
    },
    recordBuild(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_PREPARE,
        action: "build.record",
        targetType: "build",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.builds.insert(tx, makeRecord("build", {
          product_id: payload.productId,
          version_name: payload.versionName,
          version_code: payload.versionCode,
          artifact_sha256: payload.artifactSha256,
          signer_fingerprint: payload.signerFingerprint,
          signing_metadata: JSON.stringify(payload.signingMetadata),
        }), now),
      });
    },
    createRelease(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.RELEASES_PREPARE,
        action: "release.create",
        targetType: "release",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.releases.insert(tx, makeRecord("release", {
          product_id: payload.productId,
          build_id: payload.buildId,
          stage: payload.stage,
          qa_approval_state: payload.qaApprovalState,
          owner_approval_state: payload.ownerApprovalState,
          release_notes: payload.releaseNotes,
          blockers_json: JSON.stringify(payload.blockers),
        }), now),
      });
    },
    createQaPlan(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "qa_plan.create",
        targetType: "qa_plan",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.qaPlans.insert(tx, makeRecord("qaplan", {
          product_id: payload.productId,
          version_label: payload.versionLabel,
          assignments_json: JSON.stringify(payload.assignments),
          test_cases_json: JSON.stringify(payload.testCases),
        }), now),
      });
    },
    recordQaExecution(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "qa_execution.record",
        targetType: "qa_execution",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.qaExecutions.insert(tx, makeRecord("qaexec", {
          qa_plan_id: payload.qaPlanId,
          assignee_email: payload.assigneeEmail,
          result_state: payload.resultState,
          evidence_json: JSON.stringify(payload.evidence),
        }), now),
      });
    },
    reportBug(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_EXECUTE,
        action: "bug.report",
        targetType: "bug",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.bugs.insert(tx, makeRecord("bug", {
          product_id: payload.productId,
          severity: payload.severity,
          priority: payload.priority,
          status: payload.status,
          owner_email: payload.ownerEmail,
          verification_json: JSON.stringify(payload.verification),
        }), now),
      });
    },
    reviewBetaApplication(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.BETA_REVIEW,
        action: "beta_application.review",
        targetType: "beta_application",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.betaApplications.insert(tx, makeRecord("beta", {
          email: payload.email,
          device_json: JSON.stringify(payload.device),
          interests_json: JSON.stringify(payload.interests),
          status: payload.status,
          credits_json: JSON.stringify(payload.credits),
          consent_json: JSON.stringify(payload.consent),
        }), now),
      });
    },
    createAutomationJob(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.QA_ASSIGN,
        action: "automation_job.create",
        targetType: "automation_job",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.automationJobs.insert(tx, makeRecord("job", {
          product_id: payload.productId,
          ordered_steps_json: JSON.stringify(payload.orderedSteps),
          device_id: payload.deviceId,
          runner_id: payload.runnerId,
          lease_state: payload.leaseState,
          result_json: JSON.stringify(payload.result),
          evidence_json: JSON.stringify(payload.evidence),
        }), now),
      });
    },
    recordIncident(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.AUDIT_READ,
        action: "incident.record",
        targetType: "incident",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.incidents.insert(tx, makeRecord("incident", {
          product_id: payload.productId,
          severity: payload.severity,
          status: payload.status,
          evidence_json: JSON.stringify(payload.evidence),
        }), now),
      });
    },
    updateIntegrationState(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.ANALYTICS_READ,
        action: "integration_state.record",
        targetType: "integration_state",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.integrationStates.insert(tx, makeRecord("integration", {
          product_id: payload.productId,
          monitor_name: payload.monitorName,
          freshness_state: payload.freshnessState,
          details_json: JSON.stringify(payload.details),
        }), now),
      });
    },
    publishKnowledgeBaseEntry(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.DOCS_PUBLISH,
        action: "knowledge_base.publish",
        targetType: "knowledge_base_entry",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.knowledgeBaseEntries.insert(tx, makeRecord("kb", {
          slug: payload.slug,
          title: payload.title,
          publication_state: payload.publicationState,
          body: payload.body,
        }), now),
      });
    },
    recordReadinessSnapshot(context, payload) {
      return auditedMutation({
        actor: context.actor,
        permission: PERMISSIONS.ANALYTICS_READ,
        action: "readiness_snapshot.record",
        targetType: "readiness_snapshot",
        requestId: context.requestId,
        afterFactory: (tx, now) => repositories.readinessSnapshots.insert(tx, makeRecord("ready", {
          product_id: payload.productId,
          score: payload.score,
          mandatory_gates_json: JSON.stringify(payload.mandatoryGates),
          evidence_json: JSON.stringify(payload.evidence),
        }), now),
      });
    },
  };
}
