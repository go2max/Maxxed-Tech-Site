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
  RELEASES_PREPARE: "releases.prepare",
  RELEASES_APPROVE_QA: "releases.approve.qa",
  RELEASES_PROMOTE_PRODUCTION: "releases.promote.production",
  QA_EXECUTE: "qa.execute",
  QA_ASSIGN: "qa.assign",
  BETA_REVIEW: "beta.review",
  BETA_PORTAL: "beta.portal",
  SUPPORT_CASES: "support.cases",
  DOCS_EDIT: "docs.edit",
  DOCS_PUBLISH: "docs.publish",
  ANALYTICS_READ: "analytics.read",
  AUDIT_READ: "audit.read",
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.freeze(Object.values(PERMISSIONS)),
  [ROLES.ADMINISTRATOR]: Object.freeze([
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.RELEASES_PREPARE,
    PERMISSIONS.BETA_REVIEW,
    PERMISSIONS.SUPPORT_CASES,
    PERMISSIONS.DOCS_EDIT,
    PERMISSIONS.DOCS_PUBLISH,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.AUDIT_READ,
  ]),
  [ROLES.DEVELOPER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.RELEASES_PREPARE,
    PERMISSIONS.DOCS_EDIT,
  ]),
  [ROLES.QA_LEAD]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.QA_ASSIGN,
    PERMISSIONS.QA_EXECUTE,
    PERMISSIONS.RELEASES_APPROVE_QA,
    PERMISSIONS.AUDIT_READ,
  ]),
  [ROLES.QA_TESTER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.QA_EXECUTE,
  ]),
  [ROLES.BETA_MANAGER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.BETA_REVIEW,
  ]),
  [ROLES.BETA_TESTER]: Object.freeze([
    PERMISSIONS.BETA_PORTAL,
  ]),
  [ROLES.SUPPORT]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.SUPPORT_CASES,
  ]),
  [ROLES.DOCUMENTATION_EDITOR]: Object.freeze([
    PERMISSIONS.DOCS_EDIT,
    PERMISSIONS.DOCS_PUBLISH,
  ]),
  [ROLES.ANALYTICS_VIEWER]: Object.freeze([
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ANALYTICS_READ,
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
