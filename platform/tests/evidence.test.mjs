import test from "node:test";
import assert from "node:assert/strict";

import { MemoryEvidenceStore, R2EvidenceStore, UnavailableEvidenceStore } from "../src/evidence/storage.mjs";

test("memory evidence storage copies bytes and deletes objects", async () => {
  const store = new MemoryEvidenceStore();
  const source = new Uint8Array([1, 2, 3]);
  await store.put("jobs/1/evidence/file.bin", source, {
    contentType: "application/octet-stream",
    customMetadata: { sha256: "abc" },
  });
  source[0] = 9;
  const object = await store.get("jobs/1/evidence/file.bin");
  assert.deepEqual([...object.body], [1, 2, 3]);
  assert.equal(object.contentType, "application/octet-stream");
  assert.deepEqual(object.customMetadata, { sha256: "abc" });
  object.body[1] = 9;
  assert.deepEqual([...(await store.get("jobs/1/evidence/file.bin")).body], [1, 2, 3]);
  await store.delete("jobs/1/evidence/file.bin");
  assert.equal(await store.get("jobs/1/evidence/file.bin"), null);
});

test("R2 evidence storage maps private object metadata and bytes", async () => {
  const calls = [];
  const binding = {
    async put(key, bytes, options) {
      calls.push(["put", key, [...bytes], options]);
    },
    async get(key) {
      calls.push(["get", key]);
      return {
        size: 3,
        httpMetadata: { contentType: "image/png" },
        customMetadata: { jobId: "job-1" },
        async arrayBuffer() {
          return new Uint8Array([4, 5, 6]).buffer;
        },
      };
    },
    async delete(key) {
      calls.push(["delete", key]);
    },
  };
  const store = new R2EvidenceStore(binding);
  await store.put("key", new Uint8Array([1]), {
    contentType: "image/png",
    customMetadata: { jobId: "job-1" },
  });
  const object = await store.get("key");
  assert.deepEqual([...object.body], [4, 5, 6]);
  assert.equal(object.contentType, "image/png");
  assert.equal(object.size, 3);
  await store.delete("key");
  assert.deepEqual(calls.map((call) => call[0]), ["put", "get", "delete"]);
});

test("unavailable evidence storage fails closed", async () => {
  const store = new UnavailableEvidenceStore();
  await assert.rejects(() => store.put("key", new Uint8Array()), /evidence_store_unavailable/);
  await assert.rejects(() => store.get("key"), /evidence_store_unavailable/);
  await assert.rejects(() => store.delete("key"), /evidence_store_unavailable/);
});
