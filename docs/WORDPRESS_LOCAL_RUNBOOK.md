# WordPress Plugin Lab Runbook

This repo contains a local WordPress lab for uploading plugin and theme ZIP artifacts, installing them in Docker WordPress, and recording repeatable validation evidence.

The public TechMaxxed subsite is documentation only:

```text
https://techmaxxed.com/tools/wordpress-plugin-lab/
```

Actual plugin execution happens locally in Docker.

## Windows start

```powershell
npm run wordpress:lab
```

To reset the lab completely:

```powershell
powershell -ExecutionPolicy Bypass -File ./tools/wordpress/lab.ps1 -Reset
```

## Artifact upload folder

Copy plugin and theme ZIPs into:

```text
local-artifacts/wordpress/
```

Use stable filenames that match `wordpress/products.example.json`, for example:

```text
local-artifacts/wordpress/post-purge-pro.zip
local-artifacts/wordpress/wordpress-role-auditor.zip
local-artifacts/wordpress/broken-shortcode-finder.zip
```

## Install one artifact

```powershell
npm run wordpress:install -- plugin local-artifacts/wordpress/example-plugin.zip --activate
npm run wordpress:install -- theme local-artifacts/wordpress/example-theme.zip
```

## Run the manifest queue

```powershell
npm run wordpress:manifest -- wordpress/products.example.json
```

Missing ZIP artifacts are reported as skipped. Failed installs return a non-zero status.

## Manual admin check

1. Open the local lab admin URL printed by `npm run wordpress:lab`.
2. Visit Plugins, Themes, Pages, Settings, and each product admin page.
3. Open `/wp-json/maxxed/v1/health` on the local lab URL.
4. Record artifact name, install result, activation result, admin result, and public result.

## Mac/Linux helper scripts

The original bash wrappers remain available for shells that support bash:

```bash
npm run wordpress:bootstrap
npm run wordpress:smoke
npm run wordpress:status
npm run wordpress:report
npm run wordpress:reset
```
