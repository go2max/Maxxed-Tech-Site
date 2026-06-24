# Portfolio Testing Control Plane

The private Testing Functions page can queue one app or a selected batch for
the six current Android products. Jobs remain sequential per runner and device.

## Approved Products

| Product | Android package | Source repository | Automated coverage |
| --- | --- | --- | --- |
| Maxxed Remote | `com.maxxedtechnicalsystems.maxxedremote` | `go2max/Maxxed-Tech-Site` | install, launch, visible controls, full Remote UX, discovery, and TV connection evidence |
| Maxxed Compass | `com.maxxed.compass` | `go2max/Maxxed-Compass` | install, launch, crash detection, screenshots, and visible control audit |
| Maxxed Measure | `com.maxxed.measure` | `go2max/Measurement-Maxxed` | install, launch, crash detection, screenshots, and visible control audit |
| Maxxed Gold Estimator | `com.maxxed.goldestimator` | `go2max/Gold-Estimator-Maxxed` | install, launch, crash detection, screenshots, and visible control audit |
| Fishing Maxxed | `com.maxxed.fishingmaxxed` | `go2max/Fishing-Maxxed` | install, launch, crash detection, screenshots, and visible control audit |
| Rival Rush | `com.maxxed_technical_systems.rivalrushlaunch` | `go2max/Rival-Rush` | install, launch, crash detection, screenshots, and visible control audit |

Package identities were verified against each canonical repository on
June 24, 2026. `npm run check` fails when the platform catalog, runner product
map, package-bound manifests, ordered steps, or command files drift apart.

## Runner Setup

1. Copy `runner/config/products.example.json` to
   `runner/config/products.local.json`.
2. Copy `runner/config/artifacts.example.json` to
   `runner/config/artifacts.local.json`.
3. Put each local APK at the configured path. Remove products from the local
   artifact catalog when that runner should not claim them.
4. Copy `runner/config/agent.example.json` to
   `runner/config/agent.local.json`.
5. Set the actual ADB device serial returned by `adb devices`.
6. Supply `MAXXED_RUNNER_API_TOKEN` through Windows secret management.
7. Run preflight, then start the agent:

   ```powershell
   node runner/agent.mjs --config=runner/config/agent.local.json --check
   node runner/agent.mjs --config=runner/config/agent.local.json
   ```

The runner advertises only products present in its local artifact catalog.
The server will not assign another product to that runner.

## Test Behavior

Every job performs APK size and package inspection before loading its approved
manifest. The shared Android harness then:

- confirms the selected ADB device is ready
- installs the exact inspected APK
- clears logcat, force-stops the package, and launches its launcher activity
- verifies that the application process remains alive
- fails on fatal Android runtime or package-process crash evidence
- records logcat and a screenshot
- dumps the current UI hierarchy
- inventories every visible clickable or long-clickable control
- fails when no clickable controls are visible
- flags clickable controls without visible text or an accessibility description

The inventory is deliberately non-destructive. It does not blindly activate
purchase, deletion, permission, external-link, or exit controls. App-specific
flows can extend the package-bound manifest with reviewed commands. Maxxed
Remote already includes its deeper `full-ux-connection` step.

## Batch Queueing

QA Leads and Owners can select one or more apps on Testing Functions. The
browser sends product IDs, runner ID, and device ID only. The server resolves
the package identity and ordered steps from its frozen catalog.

Duplicate, unknown, empty, or oversized product selections fail before jobs are
created. Browser-supplied commands, paths, manifests, packages, and step lists
are ignored.

## Lease Protocol

A claimed job enters `running`. The runner sends a heartbeat every 15 seconds
by default with the current approved step and completed-step count.

- A queued cancellation completes immediately.
- A running cancellation enters `cancelling`.
- The next heartbeat tells the runner to terminate the active isolated child.
- The runner records a terminal `cancelled` result and releases local leases.
- Three consecutive heartbeat failures stop the job to avoid split-brain work.
- A server lease with no heartbeat for `RUNNER_LEASE_TTL_MS` is changed to
  `interrupted` and audited before the runner claims another job.

Set the server lease TTL comfortably above the heartbeat interval. The default
is five minutes. Local cross-process leases default to one hour so the 20-minute
Remote hardware step cannot outlive its device lock.

## Evidence and Results

Testing Functions shows up to 50 recent portfolio jobs with app, state, final
result, current step, completed steps, runner, device, evidence count, retry
lineage, and timestamps. App and state filters run locally. The page refreshes
every 30 seconds while visible and idle.

Retries create new audited records and preserve the source result. Completed,
failed, blocked, interrupted, and cancelled jobs are retryable.

## Security Boundaries

- platform identity, permission, session, origin, and CSRF checks protect admin mutations
- runner requests require the separate bearer token
- runner capabilities restrict which products can be claimed
- APK package inspection binds artifacts to manifests
- command references remain repository-relative and allowlisted
- child processes receive a restricted environment and no runner token
- tokens and local artifact paths do not enter browser payloads or Git
- creation, claim, completion, cancellation, retry, and lease expiry are audited

## Validation

```powershell
npm run check
node scripts/security-scan.mjs
```

The check suite validates the public site, private platform, runner, all six
package-bound manifests, lifecycle transitions, capability matching,
heartbeats, cooperative cancellation, stale recovery, and secret scanning.


Runner identity, fleet health, staged credential rotation, and result export
operations are documented in `docs/RUNNER_FLEET_OPERATIONS.md`.
