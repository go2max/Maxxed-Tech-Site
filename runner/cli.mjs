import { resolve } from "node:path";

import { runSequentialJob } from "./src/runner.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, value] = entry.split("=");
  return [key.replace(/^--/, ""), value];
}));

if (!args.apk || !args.steps || !args.products || !args.manifest || !args.stateDir || !args.reportDir) {
  console.error("Usage: node runner/cli.mjs --apk=PATH --steps=step1,step2 --products=PATH --manifest=PATH --stateDir=PATH --reportDir=PATH [--runnerId=runner-1] [--deviceId=device-1]");
  process.exit(1);
}

const report = await runSequentialJob({
  rootDir: resolve("."),
  apkPath: resolve(args.apk),
  productsConfigPath: resolve(args.products),
  scriptPackManifestPath: resolve(args.manifest),
  stateDir: resolve(args.stateDir),
  reportDir: resolve(args.reportDir),
  runnerId: args.runnerId || "runner-1",
  deviceId: args.deviceId || "device-1",
  stepIds: args.steps.split(","),
});

console.log(JSON.stringify(report, null, 2));
