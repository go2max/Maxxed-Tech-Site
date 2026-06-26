# WordPress Lab

This folder supports a real WordPress plugin-testing subsite, such as:

```text
https://plugins.techmaxxed.com/wp-admin
```

It is not the public static TechMaxxed site.

## Files

- `mu-plugins/maxxed-plugin-lab-guard.php`: optional MU plugin for the hosted WordPress lab. It adds noindex headers, disables XML-RPC, shows an admin warning, and exposes `/wp-json/maxxed-lab/v1/health`.

## Install MU Plugin

Copy the guard file into the hosted WordPress install:

```text
wp-content/mu-plugins/maxxed-plugin-lab-guard.php
```

Create `wp-content/mu-plugins/` if it does not exist.

## Workflow

1. Build plugin ZIP.
2. Log into the WordPress lab at `/wp-admin`.
3. Upload plugin ZIP through Plugins > Add New > Upload Plugin.
4. Activate and test.
5. Record evidence.
6. Only then create or update a public TechMaxxed product page.
