import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryAccessStore, PersistentAccessStore } from "../src/auth/access-store.mjs";
import { ROLES, permissionsForRoles } from "../src/auth/roles.mjs";
import { MemoryPlatformDatabase } from "../src/persistence/database.mjs";
import { applyAllMigrations } from "../src/persistence/migrations.mjs";
import { createPlatformServices } from "../src/persistence/services.mjs";

function actor(email, roles) {
  return { email, subject: `sub:${email}`, roles, permissions: permissionsForRoles(roles) };
}

test("persistent access roles replace bootstrap fallback after an active Owner exists", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const bootstrap = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const store = new PersistentAccessStore(database, {
    bootstrapOwnerEmail: bootstrap.email,
    fallbackStore: new InMemoryAccessStore({
      "admin@techmaxxed.com": [ROLES.ADMINISTRATOR],
    }),
  });

  assert.deepEqual(await store.getRolesForEmail(bootstrap.email), [ROLES.OWNER]);
  assert.deepEqual(await store.getRolesForEmail("admin@techmaxxed.com"), [ROLES.ADMINISTRATOR]);

  const user = await services.createUser({ actor: bootstrap, requestId: "create-owner" }, {
    email: bootstrap.email,
    displayName: "Owner",
    status: "active",
  });
  await services.assignRole({ actor: bootstrap, requestId: "grant-owner" }, {
    userId: user.id,
    roleName: ROLES.OWNER,
  });

  assert.deepEqual(await store.getRolesForEmail(bootstrap.email), [ROLES.OWNER]);
  assert.deepEqual(await store.getRolesForEmail("admin@techmaxxed.com"), []);

  await services.assignRole({ actor: bootstrap, requestId: "grant-developer" }, {
    userId: user.id,
    roleName: ROLES.DEVELOPER,
  });
  await services.revokeRole({ actor: bootstrap, requestId: "revoke-developer" }, {
    userId: user.id,
    roleName: ROLES.DEVELOPER,
  });
  assert.deepEqual(await store.getRolesForEmail(bootstrap.email), [ROLES.OWNER]);
});

test("access services validate roles and protect the last active Owner", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const administrator = actor("admin@techmaxxed.com", [ROLES.ADMINISTRATOR]);
  const first = await services.createUser({ actor: owner, requestId: "user-1" }, {
    email: owner.email,
    displayName: "First Owner",
    status: "active",
  });
  await services.assignRole({ actor: owner, requestId: "owner-1" }, {
    userId: first.id,
    roleName: ROLES.OWNER,
  });

  await assert.rejects(() => services.revokeRole({ actor: owner, requestId: "last-owner" }, {
    userId: first.id,
    roleName: ROLES.OWNER,
  }), /access_safety_conflict:last_active_owner/);
  await assert.rejects(() => services.updateUserStatus({ actor: owner, requestId: "disable-owner" }, {
    userId: first.id,
    status: "inactive",
  }), /access_safety_conflict:last_active_owner/);
  await assert.rejects(() => services.assignRole({ actor: administrator, requestId: "escalate" }, {
    userId: first.id,
    roleName: ROLES.OWNER,
  }), /forbidden:security.manage/);
  await assert.rejects(() => services.assignRole({ actor: owner, requestId: "bad-role" }, {
    userId: first.id,
    roleName: "Superuser",
  }), /invalid_role_name/);

  const second = await services.createUser({ actor: owner, requestId: "user-2" }, {
    email: "owner-2@techmaxxed.com",
    displayName: "Second Owner",
    status: "active",
  });
  await services.assignRole({ actor: owner, requestId: "owner-2" }, {
    userId: second.id,
    roleName: ROLES.OWNER,
  });
  await services.revokeRole({ actor: owner, requestId: "revoke-first" }, {
    userId: first.id,
    roleName: ROLES.OWNER,
  });
  const events = await database.transaction((tx) => tx.list("audit_events"));
  assert.equal(events.some((event) => event.action_name === "role.revoke"), true);
});
