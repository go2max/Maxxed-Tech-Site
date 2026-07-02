import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "runner/build-agent/maxxed-build-runner.mjs"), "utf8");

assert.doesNotMatch(source, /child_process|exec\(|spawn\(|new Function|eval\(/);
assert.match(source, /build-recipes\/web-tool\/qa-gate/);
assert.match(source, /MAXXED_BUILD_RUNNER_TOKEN/);
assert.match(source, /mode: "dry-run"/);
assert.match(source, /real Codex\/GitHub execution is not enabled yet/);

console.log("Validated build runner dry-run allowlist and no shell execution.");
