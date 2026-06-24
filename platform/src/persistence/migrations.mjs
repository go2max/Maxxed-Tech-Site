import { loadMigrationSql } from "./database.mjs";

export const MIGRATIONS = Object.freeze([
  { id: "0001_initial", file: "0001_initial.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS audit_events" },
  { id: "0002_runner_nodes", file: "0002_runner_nodes.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS runner_nodes" },
  { id: "0003_test_evidence_objects", file: "0003_test_evidence_objects.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS test_evidence_objects" },
  { id: "0004_test_schedules", file: "0004_test_schedules.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS test_schedules" },
  { id: "0005_persistent_access_directory", file: "0005_persistent_access_directory.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS access_role_events" },
  { id: "0006_backup_snapshots", file: "0006_backup_snapshots.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS backup_snapshots" },
]);

export async function applyAllMigrations(database) {
  for (const migration of MIGRATIONS) {
    if (await database.hasMigration(migration.id)) continue;
    const sql = await loadMigrationSql(migration.file);
    if (!sql.includes(migration.requiredMarker)) {
      throw new Error(`invalid_migration:${migration.id}`);
    }
    await database.applyMigration(migration.id, sql);
  }
}
