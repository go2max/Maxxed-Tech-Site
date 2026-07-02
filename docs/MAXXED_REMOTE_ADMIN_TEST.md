# Maxxed Remote Admin Test

The private admin Testing Functions catalog includes one approved script pack:
`maxxed-remote-full-ux-connection`.

## What One Run Covers

- APK SHA-256 and Maxxed Remote package verification
- Install, launch, process-alive, and crash/logcat checks
- Remote, Media, Apps, and More tab navigation
- Remote key, media, number-pad, color-key, Help, theme, and app-management controls
- Discovery sheet open/cancel behavior
- Optional manual-IP TV creation and connection attempt
- Screenshots, package metadata, memory snapshot, logcat, and structured JSON result
- Cleanup and uninstall unless retention is requested

The script never reports physical-TV success based only on a click. Pairing,
television response, power/wake, reconnect, and manufacturer-specific streaming
IDs remain `manual-review` until observed on real hardware.

## Direct Windows Run

```powershell
pwsh -File runner\script-packs\maxxed-remote\maxxed-remote-full-test.ps1 `
  -ApkPath C:\builds\maxxed-remote.apk `
  -DeviceSerial R3CT... `
  -TvIp 192.168.1.50 `
  -TvPlatform SamsungTizen
```

Add `-HardwareObserved` only after the operator watches the TV accept the
connection and respond. Exit code `0` means fully passed, `1` means failed, and
`2` means blocked or awaiting manual hardware review.

## Admin Placement

The dashboard must load `manifest.json` as an allowlisted catalog item under
**Admin > Testing Functions > Maxxed Remote**. It must pass validated fields to
the local runner and display `result.json`. The browser must never provide a
free-form command or execute ADB directly.

The public website intentionally does not publish this route. The private admin
application and runner lease/control API are still required before the button
can launch tests remotely.
