import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const patterns = [
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /ghp_[0-9A-Za-z]{36}/,
  /xox[baprs]-[0-9A-Za-z-]+/,
];

const files = [
  "README.md",
  "package.json",
  "docs/IMPLEMENTATION_STATUS.md",
  "platform/README.md",
  "runner/README.md",
];

for (const file of files) {
  const content = await readFile(resolve(file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      throw new Error(`secret_like_value_detected:${file}`);
    }
  }
}

console.log("Basic secret scan passed.");
