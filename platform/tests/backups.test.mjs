import test from "node:test";
import assert from "node:assert/strict";

import { decryptBackupSnapshot, encryptBackupSnapshot } from "../src/backups/codec.mjs";
import { MemoryBackupStore, R2BackupStore, UnavailableBackupStore } from "../src/backups/storage.mjs";

const key = Buffer.alloc(32, 7).toString("base64url");

test("backup codec encrypts, authenticates, and restores snapshots", async () => {
  const snapshot = {
    version: 1,
    createdAt: "2026-06-24T00:00:00.000Z",
    tables: { users: [{ id: "user-1", email: "owner@example.com" }], audit_events: [] },
  };
  const encrypted = await encryptBackupSnapshot(snapshot, key);
  assert.doesNotMatch(Buffer.from(encrypted.bytes).toString("utf8"), /owner@example\.com/);
  const restored = await decryptBackupSnapshot(encrypted.bytes, key);
  assert.deepEqual(restored.snapshot, snapshot);
  assert.equal(restored.plaintextSha256, encrypted.plaintextSha256);

  const wrongKey = Buffer.alloc(32, 8).toString("base64url");
  await assert.rejects(() => decryptBackupSnapshot(encrypted.bytes, wrongKey), /backup_decryption_failed/);

  const envelope = JSON.parse(Buffer.from(encrypted.bytes).toString("utf8"));
  envelope.ciphertext = envelope.ciphertext.slice(0, -1) + (envelope.ciphertext.endsWith("A") ? "B" : "A");
  await assert.rejects(
    () => decryptBackupSnapshot(new TextEncoder().encode(JSON.stringify(envelope)), key),
    /backup_decryption_failed/,
  );
});

test("backup storage adapters copy bytes and fail closed when unavailable", async () => {
  const memory = new MemoryBackupStore();
  const source = new Uint8Array([1, 2, 3]);
  await memory.put("backup.bin", source);
  source[0] = 9;
  assert.deepEqual([...(await memory.get("backup.bin"))], [1, 2, 3]);
  await memory.delete("backup.bin");
  assert.equal(await memory.get("backup.bin"), null);

  const calls = [];
  const r2 = new R2BackupStore({
    async put(key, bytes, options) { calls.push(["put", key, bytes.byteLength, options]); },
    async get(key) {
      calls.push(["get", key]);
      return { async arrayBuffer() { return new Uint8Array([4, 5]).buffer; } };
    },
    async delete(key) { calls.push(["delete", key]); },
  });
  await r2.put("r2.bin", new Uint8Array([1]));
  assert.deepEqual([...(await r2.get("r2.bin"))], [4, 5]);
  await r2.delete("r2.bin");
  assert.deepEqual(calls.map((call) => call[0]), ["put", "get", "delete"]);

  const unavailable = new UnavailableBackupStore();
  await assert.rejects(() => unavailable.get("missing"), /backup_store_unavailable/);
});
