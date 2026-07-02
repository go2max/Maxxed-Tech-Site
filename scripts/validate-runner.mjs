import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { apps } from "../platform/src/catalog.js";

const root = resolve(import.meta.dirname, "..");
const packsRoot = resolve(root, "runner", "script-packs");
const expected = new Map([
  ["maxxed-remote", "com.maxxedtechnicalsystems.maxxedremote"],
  ["maxxed-compass", "com.maxxed.compass"],
  ["maxxed-measure", "com.maxxed.measure"],
  ["maxxed-gold-estimator", "com.maxxed.goldestimator"],
  ["fishing-maxxed", "com.maxxed.fishingmaxxed"],
  ["rival-rush", "com.maxxed_technical_systems.rivalrushlaunch"]
]);

await access(resolve(root, "runner", "lib", "android-app-test.ps1"));

for (const [appId, packageId] of expected) {
  const app = apps.find((item) => item.id === appId);
  assert.ok(app, `Missing catalog app ${appId}`);
  const manifestPath = resolve(packsRoot, appId, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.app, appId);
  assert.equal(manifest.packageId, packageId);
  assert.ok(manifest.supportedScriptIds.includes("full"));
  assert.deepEqual(
    app.scripts.map((script) => script.id).sort(),
    manifest.supportedScriptIds.filter((id) => id !== "full").sort(),
    `${appId} manifest and catalog script IDs must match`
  );
  const entrypoint = resolve(packsRoot, appId, manifest.entrypoint);
  assert.ok(entrypoint.startsWith(`${resolve(packsRoot, appId)}${sep}`), "Entrypoint escaped its pack directory");
  const source = await readFile(entrypoint, "utf8");
  assert.match(source, new RegExp(packageId.replaceAll(".", "\\.")));
  assert.match(source, /android-app-test\.ps1/);
  await access(entrypoint);

  for (const script of app.scripts) {
    assert.ok(script.commandRef, `${script.id} has no approved command reference`);
    const commandPath = resolve(root, script.commandRef);
    assert.ok(commandPath.startsWith(`${packsRoot}${sep}`), `${script.id} command escaped the runner packs directory`);
    assert.equal(commandPath, entrypoint, `${script.id} must resolve through its app manifest entrypoint`);
  }
}

const agent = await readFile(resolve(root, "runner", "agent", "maxxed-runner-agent.ps1"), "utf8");
assert.match(agent, /api\/runner\/lease/);
assert.match(agent, /Send-Heartbeat/);
assert.match(agent, /Get-FileHash -Algorithm SHA256/);
assert.match(agent, /Send-Evidence/);
assert.match(agent, /foreach \(\$step in/);

console.log("Validated six runner packs, catalog parity, allowlisted command paths, and the sequential Windows lease/evidence agent contract.");
