import { basename, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function inspectApk(apkPath, maxBytes) {
  const bytes = await readFile(apkPath);
  if (bytes.byteLength > maxBytes) {
    throw new Error("apk_too_large");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const sidecarPath = `${apkPath}.json`;
  const metadata = await readJson(sidecarPath);

  if (!metadata.packageName || !metadata.versionName) {
    throw new Error("invalid_apk_metadata");
  }

  return {
    fileName: basename(apkPath),
    absolutePath: resolve(apkPath),
    sha256,
    metadata,
  };
}
