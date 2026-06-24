# Maxxed Private Platform

This directory contains the private control-plane Worker and its tests. It is a
separate trust boundary from the public website and the local APK runner.

## Local validation

```powershell
node .\scripts\check-platform.mjs
```

The platform trusts identity only from configured server-side headers. Browser
code does not assign roles or permissions. Production requests must present a
validated server-side identity JWT; mirrored identity headers are treated only
as consistency checks.
