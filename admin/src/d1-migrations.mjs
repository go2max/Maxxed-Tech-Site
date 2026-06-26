import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function listAdminMigrations(dir = "admin/db/migrations") {
  const files = (await readdir(dir)).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();
  const migrations = [];
  for (const file of files) {
    const sql = await readFile(join(dir, file), "utf8");
    migrations.push({
      file,
      statementCount: sql.split(";").map((item) => item.trim()).filter(Boolean).length,
      hasCreateTable: /create\s+table/i.test(sql),
      hasAuditTable: /audit/i.test(sql),
      bytes: Buffer.byteLength(sql)
    });
  }
  return migrations;
}

export function validateMigrationSequence(migrations) {
  const errors = [];
  migrations.forEach((migration, index) => {
    const expectedPrefix = String(index + 1).padStart(4, "0");
    if (!migration.file.startsWith(expectedPrefix + "_")) errors.push(`migration_sequence_gap:${migration.file}:expected_${expectedPrefix}`);
    if (migration.statementCount < 1) errors.push(`empty_migration:${migration.file}`);
  });
  return { ok: errors.length === 0, errors };
}
