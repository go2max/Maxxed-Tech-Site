import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai", "drizzle"), { recursive: true });
await cp(resolve(root, "src"), resolve(dist, "server"), { recursive: true });
await cp(resolve(root, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));
await cp(resolve(root, "migrations"), resolve(dist, ".openai", "drizzle"), { recursive: true });

console.log("Built the private admin testing Worker, R2 contract, and D1 migrations.");
