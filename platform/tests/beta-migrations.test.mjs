import test from "node:test";
import assert from "node:assert/strict";

import { D1PlatformDatabase, MemoryD1Binding, loadMigrationSql } from "../src/persistence/database.mjs";
import { applyAllMigrations, MIGRATIONS } from "../src/persistence/migrations.mjs";

test("beta enrollment migration creates event, sync, and data request indexes", async () => {
  const sql = await loadMigrationSql("0009_beta_enrollment_play_integrations.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS beta_enrollment_events/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS beta_track_syncs/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS beta_data_requests/);

  const binding = new MemoryD1Binding();
  const database = new D1PlatformDatabase(binding);
  await applyAllMigrations(database);

  assert.equal(MIGRATIONS.some((migration) => migration.id === "0009_beta_enrollment_play_integrations"), true);
  assert.equal(binding.indexes.has("beta_enrollment_events_application"), true);
  assert.equal(binding.indexes.has("beta_enrollment_events_email"), true);
  assert.equal(binding.indexes.has("beta_track_syncs_track"), true);
  assert.equal(binding.indexes.has("beta_data_requests_status"), true);
  assert.equal(await database.hasMigration("0009_beta_enrollment_play_integrations"), true);
});
