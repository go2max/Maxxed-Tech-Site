# Maxxed Sequential APK Runner

The runner is a local Windows-first tool for dry runs and sequential APK test
jobs. Approved script-pack manifests are bound to public application package
IDs, executed in isolated child processes, and protected by cross-process lease
state. Production signing keys and service credentials never belong in Git or
on runner machines.

## Claim One Admin Job

Set the runner token through local secret management, then run one claim cycle:

```powershell

node runner/remote-cli.mjs `
  --platform=https://admin.techmaxxed.com `
  --apk=C:\builds\maxxed-remote.apk `
  --products=C:\maxxed-runner\products.json `
  --manifest=runner\config\script-packs\maxxed-remote\manifest.json `
  --stateDir=C:\maxxed-runner\state `
  --reportDir=C:\maxxed-runner\reports `
  --runnerId=local-windows-runner `
  --deviceId=android-device-1 `
  --inspectionMode=production `
  --aaptPath=C:\Android\build-tools\35.0.0\aapt.exe
```

The client claims only a job assigned to the exact runner and device, executes
its server-approved steps sequentially, and returns a bounded result and
evidence index. A 404 claim response means the runner is idle.
