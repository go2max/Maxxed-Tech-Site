import { loadMigrationSql } from "./database.mjs";

export const MIGRATIONS = Object.freeze([
  { id: "0001_initial", file: "0001_initial.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS audit_events" },
  { id: "0002_runner_nodes", file: "0002_runner_nodes.sql", requiredMarker: "CREATE TABLE IF NOT EXISTS runner_nodes" },
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
