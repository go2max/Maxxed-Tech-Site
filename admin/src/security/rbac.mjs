export const roles = [
  'Owner',
  'Administrator',
  'Developer',
  'QA Lead',
  'Beta Manager',
  'Support',
  'Documentation Editor',
  'Analytics Viewer'
];

export const permissions = {
  canReadProducts: ['Owner','Administrator','Developer','QA Lead','Beta Manager','Support','Documentation Editor','Analytics Viewer'],
  canManageProducts: ['Owner','Administrator'],
  canReadBeta: ['Owner','Administrator','Beta Manager','Support','Analytics Viewer'],
  canManageBeta: ['Owner','Administrator','Beta Manager'],
  canReadReleases: ['Owner','Administrator','Developer','QA Lead','Analytics Viewer'],
  canManageReleases: ['Owner','Administrator','Developer','QA Lead'],
  canApproveReleases: ['Owner','Administrator','QA Lead'],
  canReadSupport: ['Owner','Administrator','Support','Developer','QA Lead'],
  canManageSupport: ['Owner','Administrator','Support'],
  canReadMonitoring: ['Owner','Administrator','Developer','QA Lead','Analytics Viewer'],
  canManageMonitoring: ['Owner','Administrator','Developer','QA Lead'],
  canReadAudit: ['Owner','Administrator'],
  canManageAccess: ['Owner'],
  canExportData: ['Owner','Administrator']
};

export function normalizeRoles(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map((role) => role.trim()).filter((role) => roles.includes(role));
}

export function hasPermission(identity, permission) {
  if (!identity || !identity.email) return false;
  const allowed = permissions[permission];
  if (!allowed) return false;
  return normalizeRoles(identity.roles).some((role) => allowed.includes(role));
}

export function requirePermission(identity, permission) {
  if (!hasPermission(identity, permission)) {
    const err = new Error(`Forbidden: ${permission}`);
    err.status = identity?.email ? 403 : 401;
    throw err;
  }
  return true;
}

export function highestRole(identity) {
  const userRoles = normalizeRoles(identity?.roles);
  return roles.find((role) => userRoles.includes(role)) || null;
}
