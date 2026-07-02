import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = resolve(root, "public");
const siteDir = resolve(root, "site");

await rm(publicDir, { recursive: true, force: true });

await import("./build.mjs");
await import("./apply-public-redesign.mjs");

await rm(publicDir, { recursive: true, force: true });
await cp(siteDir, publicDir, { recursive: true });

console.log("Built public site output.");
