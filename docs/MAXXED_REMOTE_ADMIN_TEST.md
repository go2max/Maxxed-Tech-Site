# Maxxed Remote Full Test

The private platform exposes the approved Maxxed Remote test under
`/testing-functions`. The sequential runner resolves the
`full-ux-connection` step from the package-bound manifest at
`runner/config/script-packs/maxxed-remote/manifest.json`.

## Coverage

- APK package verification, install, launch, process-alive, and crash checks
- Remote, Media, Apps, and More navigation
- Remote keys, media controls, number pad, color keys, Help, and themes
- Saved-TV, service-tile, discovery, rescan, and manual-add controls
- Optional manual-IP television connection attempt
- Screenshots, logcat, package metadata, memory evidence, and JSON results
- Cleanup and uninstall unless explicitly retained

Real television pairing, on-screen response, wake/power, reconnect, and
manufacturer-specific streaming behavior remain blocked or manual review until
an operator observes them on compatible hardware.

## Direct Windows Run

```powershell
pwsh -File runner\scripts\maxxed-remote\maxxed-remote-full-test.ps1 `
  -ApkPath C:\builds\maxxed-remote.apk `
  -DeviceSerial R3CT... `
  -TvIp 192.168.1.50 `
  -TvPlatform SamsungTizen
```

Add `-HardwareObserved` only after observing the television accept the
connection and respond. Exit code `0` means passed, `1` means failed, and
`2` means blocked or awaiting physical review.

The browser never supplies commands or executable paths. The local runner loads
only the version-controlled command reference from the approved manifest.

## Admin Job Lifecycle

The Testing Functions page shows the ten most recently updated Remote jobs and
refreshes every 30 seconds while idle. QA Leads can cancel a job only while it
is queued. Completed, failed, blocked, interrupted, or cancelled jobs can be
retried as new audited jobs; the original result and evidence remain intact.

See `docs/MAXXED_REMOTE_OPERATIONS.md` for the production checklist and
recovery procedures.
