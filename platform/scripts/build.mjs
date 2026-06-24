import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai", "drizzle"), { recursive: true });
await cp(resolve(root, "src", "index.js"), resolve(dist, "server", "index.js"));
await cp(resolve(root, "src", "catalog.js"), resolve(dist, "server", "catalog.js"));
await cp(resolve(root, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));
await cp(resolve(root, "migrations", "0000_testing_jobs.sql"), resolve(dist, ".openai", "drizzle", "0000_testing_jobs.sql"));

console.log("Built the private admin testing Worker and D1 migration.");
