import { listAdminMigrations, validateMigrationSequence } from "../admin/src/d1-migrations.mjs";
const migrations = await listAdminMigrations();
const validation = validateMigrationSequence(migrations);
console.log(JSON.stringify({ ok: validation.ok, migrations, errors: validation.errors }, null, 2));
if (!validation.ok) process.exitCode = 1;
