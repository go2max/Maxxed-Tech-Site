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
