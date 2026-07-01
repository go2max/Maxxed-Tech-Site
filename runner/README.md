# Maxxed Android Test Runner Packs

The private admin catalog maps approved script IDs to PowerShell entrypoints in
`runner/script-packs/`. The browser never supplies a command or path.

Each non-TV app pack accepts an APK, one manifest-approved `TestId`, and an
optional ADB serial. The shared core verifies the artifact and installed
package, launches the app, checks process survival and expected UI, exercises
permission-denied behavior where applicable, performs background/reopen and
rotation checks, runs controlled input robustness, scans logcat, and captures a
structured report plus screenshots and device evidence.

Example:

```powershell
pwsh -File runner\script-packs\maxxed-compass\maxxed-compass-test.ps1 `
  -ApkPath C:\builds\MaxxedCompass.apk `
  -TestId compass-recovery `
  -DeviceSerial R3CT...
```

Use `-TestId full` for the broad automated pass. Physical checks deliberately
return `manual-review`; an emulator pass never substitutes for camera, sensor,
outdoor, television, or two-player acceptance.

Exit code `0` is pass, `1` is fail, and `2` is blocked or manual review. Each
run writes `result.json`, screenshots, `logcat.txt`, `meminfo.txt`, and
`package.txt` to its output directory.

## Build Runner Skeleton

`runner/build-agent/maxxed-build-runner.mjs` leases build pipeline steps from
`/api/build-runner/lease` and resolves only approved `commandRef` values. It is
dry-run only right now: it confirms the contract, writes a local `result.json`,
and completes the run as blocked until real Codex/GitHub execution is explicitly
enabled.

Example:

```sh
MAXXED_BUILD_RUNNER_TOKEN=... node runner/build-agent/maxxed-build-runner.mjs \
  --base-url https://admin.techmaxxed.com \
  --runner-id local-build-runner-1
```

The script must never accept shell text from the admin browser. Add new behavior
by adding a fixed handler for a fixed `commandRef`.
