# Maxxed Sequential APK Runner

The Windows-first runner executes package-bound Android test packs for all six
current apps. It claims only products present in its local artifact catalog,
runs one job at a time, sends lease heartbeats, and returns bounded results and
evidence. Credentials and production signing keys never belong in Git or child
process environments.

## Configure

Copy these examples to their ignored local equivalents:

- `runner/config/products.example.json` to `products.local.json`
- `runner/config/artifacts.example.json` to `artifacts.local.json`
- `runner/config/agent.example.json` to `agent.local.json`

Update APK paths, the ADB device serial, Android SDK tool path, and any products
this machine should support. Supply `MAXXED_RUNNER_API_TOKEN` through Windows
secret management.

## Preflight and Start

```powershell
node runner/agent.mjs --config=runner/config/agent.local.json --check
node runner/agent.mjs --config=runner/config/agent.local.json
```

Preflight verifies the product map, artifact catalog, every configured APK and
manifest, and the configured Android SDK tool. The agent advertises only those
products to the claim API and publishes its version on idle and active check-ins.

The agent waits for each child before polling again. Successful and idle cycles
use `pollSeconds`; failed cycles use `errorBackoffSeconds`. Active jobs send
heartbeats at `heartbeatSeconds`; local cross-process leases use
`localLeaseSeconds` and default to one hour. A server cancellation kills the isolated
active step and records `cancelled`; repeated heartbeat failure stops work to
avoid split-brain execution.

`Ctrl+C` or a service stop signal terminates the active child and exits
cleanly. Run the process as a dedicated non-administrator Windows account.

## One Manual Cycle

```powershell
node runner/remote-cli.mjs `
  --platform=https://admin.techmaxxed.com `
  --products=C:\maxxed-runner\products.local.json `
  --artifacts=C:\maxxed-runner\artifacts.local.json `
  --stateDir=C:\maxxed-runner\state `
  --reportDir=C:\maxxed-runner\reports `
  --runnerId=local-windows-runner `
  --deviceId=R3CT... `
  --inspectionMode=production `
  --aaptPath=C:\Android\build-tools\35.0.0\aapt.exe `
  --heartbeatSeconds=15 `
  --localLeaseSeconds=3600
```

Legacy `--apk` and `--manifest` arguments remain available for a dedicated
Maxxed Remote runner. The artifact catalog is required for portfolio operation.

See `docs/PORTFOLIO_TESTING_CONTROL_PLANE.md` for the full package inventory,
lease protocol, evidence contract, and recovery procedures.


Use a unique local token per runner. Hosted mapping, staged rotation, fleet
health, and incident procedures are in `docs/RUNNER_FLEET_OPERATIONS.md`.

Before job completion, the runner uploads evidence found beneath `reportDir` to
the private platform store. Paths outside that directory are ignored; oversized
files stop completion. Keep `evidenceMaxBytes` aligned with the hosted
`EVIDENCE_MAX_BYTES` value. Storage and retention operations are documented in
`docs/PRIVATE_TEST_EVIDENCE.md`.
