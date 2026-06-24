import { basename, resolve } from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function streamSha256WithLimit(apkPath, maxBytes) {
  const hash = createHash("sha256");
  let bytesRead = 0;
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(apkPath);
    stream.on("data", (chunk) => {
      bytesRead += chunk.byteLength;
      if (bytesRead > maxBytes) {
        stream.destroy(new Error("apk_too_large"));
        return;
      }
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return {
    bytesRead,
    sha256: hash.digest("hex"),
  };
}

export function createAndroidSdkInspectionAdapter({ aaptPath }) {
  return {
    async inspectMetadata(apkPath) {
      const { stdout } = await execFileAsync(aaptPath, ["dump", "badging", apkPath], { windowsHide: true, shell: false });
      const packageMatch = stdout.match(/package: name='([^']+)'(?: versionCode='([^']+)')?(?: versionName='([^']+)')?/);
      if (!packageMatch) {
        throw new Error("invalid_apk_metadata");
      }
      return {
        packageName: packageMatch[1],
        versionCode: packageMatch[2] ? Number(packageMatch[2]) : null,
        versionName: packageMatch[3] || null,
      };
    },
  };
}

async function inspectFromSidecar(apkPath) {
  const metadata = await readJson(`${apkPath}.json`);
  if (!metadata.packageName || !metadata.versionName) {
    throw new Error("invalid_apk_metadata");
  }
  return metadata;
}

export async function inspectApk(apkPath, { maxBytes, mode = "test", adapter = null }) {
  const { sha256, bytesRead } = await streamSha256WithLimit(apkPath, maxBytes);
  const metadata =
    mode === "test"
      ? await inspectFromSidecar(apkPath)
      : await adapter?.inspectMetadata?.(apkPath);

  if (!metadata?.packageName || !metadata?.versionName) {
    throw new Error(mode === "test" ? "invalid_apk_metadata" : "android_sdk_inspection_required");
  }

  return {
    fileName: basename(apkPath),
    absolutePath: resolve(apkPath),
    sha256,
    byteLength: bytesRead,
    metadata,
  };
}
