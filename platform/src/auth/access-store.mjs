import { ROLES } from "./roles.mjs";

export class InMemoryAccessStore {
  constructor(seed = {}) {
    this.byEmail = new Map(Object.entries(seed));
  }

  getRolesForEmail(email) {
    return this.byEmail.get(email.toLowerCase()) ?? [];
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
