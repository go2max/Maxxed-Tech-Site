# WordPress Local Runbook

## Clean start

```bash
npm run wordpress:reset
npm run wordpress:bootstrap
```

## Smoke test

```bash
npm run wordpress:smoke
```

## Test a plugin ZIP

```bash
mkdir -p local-artifacts/wordpress
cp /path/to/plugin.zip local-artifacts/wordpress/plugin.zip
./tools/wordpress/install-plugin-zip.sh local-artifacts/wordpress/plugin.zip --activate
npm run wordpress:smoke
```

## Test a theme ZIP

```bash
mkdir -p local-artifacts/wordpress
cp /path/to/theme.zip local-artifacts/wordpress/theme.zip
./tools/wordpress/install-theme-zip.sh local-artifacts/wordpress/theme.zip --activate
npm run wordpress:smoke
```

## Manual admin check

1. Open `http://localhost:8080/wp-admin`.
2. Visit Plugins, Themes, Pages, Settings, and any product admin pages.
3. Open `http://localhost:8080/wp-json/`.
4. Record artifact name, install result, activation result, admin result, and public result.

## Recovery

```bash
npm run wordpress:reset
npm run wordpress:bootstrap
```
