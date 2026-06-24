import { TABLES } from "../persistence/schema.mjs";
import { decryptBackupSnapshot, encryptBackupSnapshot } from "./codec.mjs";

export const BACKUP_TABLES = Object.freeze([
  "schema_migrations",
  ...TABLES.filter((table) => table !== "backup_snapshots"),
]);

export async function createEncryptedBackup({
  state,
  store,
  encryptionKey,
  actor,
  requestId,
  retentionDays,
  maximumBytes,
  now = new Date(),
}) {
  const createdAt = now.toISOString();
  const tables = await state.database.transaction(async (tx) => {
    const snapshot = {};
    for (const table of BACKUP_TABLES) snapshot[table] = await tx.list(table);
    return snapshot;
  });
  const tableCounts = Object.fromEntries(BACKUP_TABLES.map((table) => [table, tables[table].length]));
  const archive = await encryptBackupSnapshot({
    version: 1,
    createdAt,
    tables,
  }, encryptionKey);
  if (archive.bytes.byteLength > maximumBytes) throw new Error("backup_too_large");
  const id = `backup-${crypto.randomUUID()}`;
  const objectKey = `backups/${createdAt.slice(0, 7)}/${id}.bin`;
  const retentionUntil = new Date(now.getTime() + retentionDays * 86_400_000).toISOString();
  await store.put(objectKey, archive.bytes);
  try {
    const record = await state.services.recordBackupSnapshot({ actor, requestId }, {
      id,
      objectKey,
      plaintextSha256: archive.plaintextSha256,
      byteSize: archive.bytes.byteLength,
      tableCounts,
      retentionUntil,
    });
    return { record, tableCounts };
  } catch (error) {
    await store.delete(objectKey);
    throw error;
  }
}

export async function verifyEncryptedBackup({
  state,
  store,
  encryptionKey,
  actor,
  requestId,
  record,
  maximumBytes,
}) {
  let details;
  try {
    const bytes = await store.get(record.object_key);
    if (!bytes) throw new Error("missing_backup_object");
    if (bytes.byteLength > maximumBytes) throw new Error("backup_too_large");
    const decoded = await decryptBackupSnapshot(bytes, encryptionKey);
    if (decoded.plaintextSha256 !== record.plaintext_sha256) throw new Error("backup_integrity_failed");
    const tableNames = Object.keys(decoded.snapshot.tables).sort();
    const expectedNames = [...BACKUP_TABLES].sort();
    if (JSON.stringify(tableNames) !== JSON.stringify(expectedNames)) throw new Error("backup_table_coverage_failed");
    const expectedCounts = JSON.parse(record.table_counts_json);
    for (const table of BACKUP_TABLES) {
      if (!Array.isArray(decoded.snapshot.tables[table]) ||
          decoded.snapshot.tables[table].length !== Number(expectedCounts[table])) {
        throw new Error("backup_table_count_failed");
      }
    }
    if (!state.services.auditRepository.verifyIntegrity(decoded.snapshot.tables.audit_events)) {
      throw new Error("backup_audit_integrity_failed");
    }
    details = {
      archiveCreatedAt: decoded.snapshot.createdAt,
      tables: BACKUP_TABLES.length,
      rows: Object.values(expectedCounts).reduce((sum, count) => sum + Number(count), 0),
      auditEvents: decoded.snapshot.tables.audit_events.length,
    };
    const verified = await state.services.recordBackupVerification({ actor, requestId }, {
      backupId: record.id,
      status: "verified",
      details,
    });
    return { record: verified, details };
  } catch (error) {
    await state.services.recordBackupVerification({ actor, requestId }, {
      backupId: record.id,
      status: "failed",
      details: { error: error.message },
    });
    throw error;
  }
}

export async function purgeExpiredBackups({ state, store, actor, requestId, now = new Date() }) {
  const records = await state.database.transaction((tx) => tx.list("backup_snapshots"));
  const expired = records
    .filter((record) => record.storage_state !== "deleted" && record.retention_until <= now.toISOString())
    .sort((left, right) => left.retention_until.localeCompare(right.retention_until))
    .slice(0, 100);
  for (const record of expired) {
    await store.delete(record.object_key);
    await state.services.deleteBackupSnapshot({ actor, requestId }, { backupId: record.id });
  }
  return expired.length;
}
