import { ROLES } from "./roles.mjs";

export class InMemoryAccessStore {
  constructor(seed = {}) {
    this.byEmail = new Map(Object.entries(seed));
  }

  getRolesForEmail(email) {
    return this.byEmail.get(email.toLowerCase()) ?? [];
  }
}

function effectiveRoles(userId, legacyAssignments, events) {
  const roles = new Map();
  for (const assignment of legacyAssignments) {
    if (assignment.user_id === userId) roles.set(assignment.role_name, "grant");
  }
  for (const event of events) {
    if (event.user_id === userId) roles.set(event.role_name, event.action);
  }
  return [...roles.entries()]
    .filter(([, action]) => action === "grant")
    .map(([role]) => role);
}

export class PersistentAccessStore {
  constructor(database, { bootstrapOwnerEmail = "", fallbackStore = null } = {}) {
    this.database = database;
    this.bootstrapOwnerEmail = bootstrapOwnerEmail.toLowerCase();
    this.fallbackStore = fallbackStore;
  }

  async getRolesForEmail(email) {
    const normalized = email.toLowerCase();
    const directory = await this.database.transaction(async (tx) => ({
      users: await tx.list("users"),
      legacyAssignments: await tx.list("role_assignments"),
      events: await tx.list("access_role_events"),
    }));
    const activeUsers = directory.users.filter((user) => user.status === "active");
    const activeOwnerExists = activeUsers.some((user) =>
      effectiveRoles(user.id, directory.legacyAssignments, directory.events).includes(ROLES.OWNER)
    );
    const user = directory.users.find((record) => record.email.toLowerCase() === normalized);
    if (user?.status === "active") {
      const roles = effectiveRoles(user.id, directory.legacyAssignments, directory.events);
      if (roles.length > 0) return roles;
    }
    if (activeOwnerExists || user?.status === "inactive") return [];
    if (this.bootstrapOwnerEmail && normalized === this.bootstrapOwnerEmail) return [ROLES.OWNER];
    return await this.fallbackStore?.getRolesForEmail(normalized) ?? [];
  }
}

export const defaultAccessStore = new InMemoryAccessStore({
  "owner@techmaxxed.com": [ROLES.OWNER],
  "admin@techmaxxed.com": [ROLES.ADMINISTRATOR],
  "developer@techmaxxed.com": [ROLES.DEVELOPER],
  "qa-lead@techmaxxed.com": [ROLES.QA_LEAD],
  "qa-tester@techmaxxed.com": [ROLES.QA_TESTER],
  "beta-manager@techmaxxed.com": [ROLES.BETA_MANAGER],
  "beta-tester@techmaxxed.com": [ROLES.BETA_TESTER],
  "support@techmaxxed.com": [ROLES.SUPPORT],
  "docs@techmaxxed.com": [ROLES.DOCUMENTATION_EDITOR],
  "analytics@techmaxxed.com": [ROLES.ANALYTICS_VIEWER],
});
