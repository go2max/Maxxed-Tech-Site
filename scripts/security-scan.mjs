import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const patterns = [
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /gh[pousr]_[0-9A-Za-z]{36,}/,
  /xox[baprs]-[0-9A-Za-z-]+/,
  /sk_(?:live|test)_[0-9A-Za-z]{16,}/,
  /AKIA[0-9A-Z]{16}/,
];

const likelyTextExtensions = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".env",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".sql",
  ".svg",
  ".txt",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);

const generatedPaths = new Set([
  "worker/index.js",
]);

function isGeneratedPath(path) {
  return generatedPaths.has(path) || path.startsWith("dist/") || path.startsWith("dist\\");
}

function isTextPath(path) {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return likelyTextExtensions.has(extension) || !path.includes(".");
}

const result = spawnSync("git", ["ls-files"], {
  cwd: resolve("."),
  encoding: "utf8",
  shell: false,
});

if (result.status !== 0) {
  throw new Error("git_ls_files_failed");
}

for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
  if (isGeneratedPath(file)) continue;
  if (!isTextPath(file)) continue;
  const content = await readFile(resolve(file));
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      throw new Error(`secret_like_value_detected:${file}`);
    }
  }
}

console.log("Tracked source text-file secret scan passed.");
