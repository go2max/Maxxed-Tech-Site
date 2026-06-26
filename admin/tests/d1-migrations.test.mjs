import test from "node:test";
import assert from "node:assert/strict";
import { listAdminMigrations, validateMigrationSequence } from "../src/d1-migrations.mjs";

test("admin D1 migrations are ordered and non-empty", async () => {
  const migrations = await listAdminMigrations();
  assert.ok(migrations.length >= 1);
  assert.equal(validateMigrationSequence(migrations).ok, true);
  assert.equal(migrations[0].hasCreateTable, true);
});
