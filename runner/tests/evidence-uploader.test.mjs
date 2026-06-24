import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { uploadEvidenceFiles } from "../src/evidence-uploader.mjs";

test("evidence uploader confines paths and sends credentials only in headers", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "maxxed-evidence-"));
  const reportDir = resolve(root, "reports");
  const captures = resolve(reportDir, "captures");
  await mkdir(captures, { recursive: true });
  await writeFile(resolve(captures, "screen.png"), Buffer.from([1, 2, 3, 4]));
  await writeFile(resolve(root, "outside.txt"), "must not upload");
  const requests = [];
  const token = `runner-secret-${"x".repeat(32)}`;
  const evidence = await uploadEvidenceFiles({
    report: {
      steps: [{
        stepId: "launch-smoke",
        evidence: [
          { type: "screenshot", ref: "captures" },
          { type: "escape", ref: "../outside.txt" },
        ],
      }],
    },
    reportDir,
    platformUrl: new URL("https://admin.techmaxxed.com"),
    platformJobId: "job-1",
    runnerId: "runner-1",
    token,
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({
        record: {
          id: "evidence-1",
          stepId: "launch-smoke",
          artifactName: "screen.png",
          byteSize: 4,
          sha256: "a".repeat(64),
          ref: "evidence:evidence-1",
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/runner\/jobs\/job-1\/evidence\/screen\.png$/);
  assert.equal(requests[0].init.headers.authorization, `Bearer ${token}`);
  assert.equal(requests[0].init.headers["x-maxxed-runner-id"], "runner-1");
  assert.equal(requests[0].init.headers["x-maxxed-step-id"], "launch-smoke");
  assert.doesNotMatch(Buffer.from(requests[0].init.body).toString("utf8"), /runner-secret/);
  assert.deepEqual(evidence, [{
    stepId: "launch-smoke",
    type: "screenshot",
    ref: "evidence:evidence-1",
    evidenceId: "evidence-1",
    artifactName: "screen.png",
    byteSize: 4,
    sha256: "a".repeat(64),
  }]);
  await rm(root, { recursive: true, force: true });
});

test("evidence uploader rejects oversized local artifacts before network I/O", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "maxxed-evidence-limit-"));
  await writeFile(resolve(root, "large.txt"), "12345");
  let requests = 0;
  await assert.rejects(() => uploadEvidenceFiles({
    report: { steps: [{ stepId: "ux-inventory", evidence: [{ ref: "large.txt" }] }] },
    reportDir: root,
    platformUrl: new URL("https://admin.techmaxxed.com"),
    platformJobId: "job-2",
    runnerId: "runner-1",
    token: "x".repeat(40),
    maxBytes: 4,
    fetchImpl: async () => {
      requests += 1;
      throw new Error("unexpected_request");
    },
  }), /evidence_too_large/);
  assert.equal(requests, 0);
  await rm(root, { recursive: true, force: true });
});
