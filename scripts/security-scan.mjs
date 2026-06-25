import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const patterns = [
  ["private-key", /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/],
  ["google-api-key", /AIza[0-9A-Za-z\-_]{35}/],
  ["github-token", /gh[pousr]_[0-9A-Za-z]{36,}/],
  ["slack-token", /xox[baprs]-[0-9A-Za-z-]+/],
  ["stripe-key", /sk_(?:live|test)_[0-9A-Za-z]{16,}/],
  ["aws-access-key", /AKIA[0-9A-Z]{16}/],
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

const findings = [];

for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
  if (isGeneratedPath(file)) continue;
  if (!isTextPath(file)) continue;
  const content = await readFile(resolve(file));
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  for (const [name, pattern] of patterns) {
    if (pattern.test(text)) {
      findings.push(`${file}:${name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Secret-like values detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Tracked source text-file secret scan passed.");
