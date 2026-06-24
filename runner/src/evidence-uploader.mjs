import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";

const CONTENT_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".txt", "text/plain"],
  [".json", "application/json"],
  [".xml", "application/xml"],
  [".mp4", "video/mp4"],
]);

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith("../") && !rel.startsWith("..\\");
}

async function evidenceFiles(report, reportDir) {
  const root = resolve(reportDir);
  const candidates = [];
  for (const step of report.steps || []) {
    for (const item of step.evidence || []) {
      const ref = String(item.ref || "");
      if (!ref || ref.includes("\0")) continue;
      const candidate = resolve(root, ref);
      if (!isInside(root, candidate)) continue;
      let details;
      try {
        details = await lstat(candidate);
      } catch {
        continue;
      }
      if (details.isFile()) {
        candidates.push({ stepId: step.stepId, type: item.type, path: candidate });
      } else if (details.isDirectory()) {
        for (const entry of await readdir(candidate, { withFileTypes: true })) {
          if (entry.isFile() && !entry.isSymbolicLink()) {
            candidates.push({ stepId: step.stepId, type: item.type, path: resolve(candidate, entry.name) });
          }
        }
      }
    }
  }
  const seen = new Set();
  return candidates.filter((item) => {
    const key = `${item.stepId}\0${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
}

export async function uploadEvidenceFiles({
  report,
  reportDir,
  platformUrl,
  platformJobId,
  runnerId,
  token,
  fetchImpl = fetch,
  maxBytes = 25 * 1024 * 1024,
}) {
  const uploaded = [];
  for (const item of await evidenceFiles(report, reportDir)) {
    const details = await lstat(item.path);
    if (details.isSymbolicLink() || !details.isFile()) throw new Error("invalid_evidence_file");
    if (!details.size || details.size > maxBytes) {
      throw new Error(details.size > maxBytes ? "evidence_too_large" : "invalid_evidence_body");
    }
    const bytes = await readFile(item.path);
    const artifactName = basename(item.path).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
    if (!/^[A-Za-z0-9]/.test(artifactName)) throw new Error("invalid_evidence_name");
    const response = await fetchImpl(
      new URL(`/runner/jobs/${encodeURIComponent(platformJobId)}/evidence/${encodeURIComponent(artifactName)}`, platformUrl),
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "x-maxxed-runner-id": runnerId,
          "x-maxxed-step-id": String(item.stepId || "job").slice(0, 80),
          "content-type": CONTENT_TYPES.get(extname(artifactName).toLowerCase()) || "application/octet-stream",
        },
        body: bytes,
      },
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `evidence_upload_${response.status}`);
    uploaded.push({
      stepId: payload.record.stepId,
      type: String(item.type || "artifact").slice(0, 40),
      ref: payload.record.ref,
      evidenceId: payload.record.id,
      artifactName: payload.record.artifactName,
      byteSize: payload.record.byteSize,
      sha256: payload.record.sha256,
    });
  }
  return uploaded;
}
