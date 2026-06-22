import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import worker from "../worker/index.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = resolve(projectRoot, "dist");

await rm(distRoot, { recursive: true, force: true });
await mkdir(resolve(distRoot, "server"), { recursive: true });
await mkdir(resolve(distRoot, ".openai"), { recursive: true });
await mkdir(resolve(distRoot, "client"), { recursive: true });

await copyFile(
  resolve(projectRoot, "worker/index.js"),
  resolve(distRoot, "server/index.js"),
);
await copyFile(
  resolve(projectRoot, ".openai/hosting.json"),
  resolve(distRoot, ".openai/hosting.json"),
);

const response = await worker.fetch(new Request("https://example.test/"));
if (!response.ok) {
  throw new Error(`Static export failed with HTTP ${response.status}`);
}

const html = await response.text();
await writeFile(resolve(projectRoot, "index.html"), html, "utf8");
await writeFile(resolve(distRoot, "client/index.html"), html, "utf8");

console.log(`Built Worker and static HTML in ${distRoot}`);
