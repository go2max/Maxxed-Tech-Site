export const ROLES = Object.freeze({
  OWNER: "Owner",
  ADMINISTRATOR: "Administrator",
  DEVELOPER: "Developer",
  QA_LEAD: "QA Lead",
  QA_TESTER: "QA Tester",
  BETA_MANAGER: "Beta Manager",
  BETA_TESTER: "Beta Tester",
  SUPPORT: "Support",
  DOCUMENTATION_EDITOR: "Documentation Editor",
  ANALYTICS_VIEWER: "Analytics Viewer",
});

export const PERMISSIONS = Object.freeze({
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  SECURITY_MANAGE: "security.manage",
  PRODUCTS_READ: "products.read",
  PRODUCTS_WRITE: "products.write",
  RELEASES_READ: "releases.read",
  RELEASES_PREPARE: "releases.prepare",
  RELEASES_APPROVE_QA: "releases.approve.qa",
  RELEASES_PROMOTE_PRODUCTION: "releases.promote.production",
  QA_READ: "qa.read",
  QA_EXECUTE: "qa.execute",
  QA_ASSIGN: "qa.assign",
  BETA_READ: "beta.read",
  BETA_REVIEW: "beta.review",
  BETA_PORTAL: "beta.portal",
  SUPPORT_READ: "support.read",
  SUPPORT_CASES: "support.cases",
  DOCS_READ: "docs.read",
  DOCS_EDIT: "docs.edit",
  DOCS_PUBLISH: "docs.publish",
  ANALYTICS_READ: "analytics.read",
  INCIDENTS_READ: "incidents.read",
  INCIDENTS_WRITE: "incidents.write",
  INTEGRATIONS_READ: "integrations.read",
  INTEGRATIONS_WRITE: "integrations.write",
  READINESS_READ: "readiness.read",
  READINESS_WRITE: "readiness.write",
  AUDIT_READ: "audit.read",
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.freeze(Object.values(PERMISSIONS)),
  [ROLES.ADMINISTRATOR]: Object.freeze([
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.RELEASES_READ,
    PERMISSIONS.RELEASES_PREPARE,
    PERMISSIONS.BETA_READ,
    PERMISSIONS.BETA_REVIEW,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_CASES,
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.DOCS_EDIT,
    PERMISSIONS.DOCS_PUBLISH,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.INCIDENTS_READ,
    PERMISSIONS.INCIDENTS_WRITE,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_WRITE,
    PERMISSIONS.READINESS_READ,
    PERMISSIONS.READINESS_WRITE,
    PERMISSIONS.AUDIT_READ,
  ]),
  [ROLES.DEVELOPER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.RELEASES_READ,
    PERMISSIONS.RELEASES_PREPARE,
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.DOCS_EDIT,
  ]),
  [ROLES.QA_LEAD]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.RELEASES_READ,
    PERMISSIONS.QA_READ,
    PERMISSIONS.QA_ASSIGN,
    PERMISSIONS.QA_EXECUTE,
    PERMISSIONS.RELEASES_APPROVE_QA,
    PERMISSIONS.INCIDENTS_READ,
    PERMISSIONS.INCIDENTS_WRITE,
    PERMISSIONS.AUDIT_READ,
  ]),
  [ROLES.QA_TESTER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.QA_READ,
    PERMISSIONS.QA_EXECUTE,
  ]),
  [ROLES.BETA_MANAGER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.BETA_READ,
    PERMISSIONS.BETA_REVIEW,
  ]),
  [ROLES.BETA_TESTER]: Object.freeze([
    PERMISSIONS.BETA_PORTAL,
  ]),
  [ROLES.SUPPORT]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_CASES,
    PERMISSIONS.INCIDENTS_READ,
  ]),
  [ROLES.DOCUMENTATION_EDITOR]: Object.freeze([
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.DOCS_EDIT,
    PERMISSIONS.DOCS_PUBLISH,
  ]),
  [ROLES.ANALYTICS_VIEWER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.READINESS_READ,
  ]),
});

export function permissionsForRoles(roles) {
  const permissions = new Set();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function hasPermission(identity, permission) {
  return identity.permissions.has(permission);
}
