import { loadMigrationSql } from "./database.mjs";

export const MIGRATIONS = Object.freeze([
  { id: "0001_initial", file: "0001_initial.sql" },
]);

export async function applyAllMigrations(database) {
  for (const migration of MIGRATIONS) {
    if (database.appliedMigrations.has(migration.id)) continue;
    const sql = await loadMigrationSql(migration.file);
    if (!sql.includes("CREATE TABLE IF NOT EXISTS audit_events")) {
      throw new Error(`invalid_migration:${migration.id}`);
    }
    await database.applyMigration(migration.id);
  }
}
