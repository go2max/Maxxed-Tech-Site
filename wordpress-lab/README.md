# WordPress Lab

This folder supports the hosted WordPress plugin-testing subsite.

Primary admin URL:

```text
https://plugins.techmaxxed.com/wp-admin
```

Alternate admin URL:

```text
https://wp-lab.techmaxxed.com/wp-admin
```

This is not the public static TechMaxxed site, and it is not the local Docker harness. The hosted subsite is the lab of record for uploading and testing Maxxed plugin ZIP files.

## Files

- `mu-plugins/maxxed-plugin-lab-guard.php`: MU plugin for the hosted WordPress lab. It adds noindex headers, disables XML-RPC, shows an admin warning, and exposes `/wp-json/maxxed-lab/v1/health`.

## Install MU Plugin

Copy the guard file into the hosted WordPress install:

```text
wp-content/mu-plugins/maxxed-plugin-lab-guard.php
```

Create `wp-content/mu-plugins/` if it does not exist.

## Server Workflow

1. Log into the hosted WordPress lab at `/wp-admin`.
2. Confirm HTTPS is active.
3. Confirm the lab guard admin notice is visible.
4. Upload plugin ZIP through Plugins > Add New > Upload Plugin.
5. Activate and test.
6. Record evidence.
7. Remove failed test plugins before testing the next ZIP.
8. Only then create or update a public TechMaxxed product page.

## Local Workflow

Local Docker can be used for preflight testing, but it is optional and must not be treated as the production lab. If the local PC is offline, the hosted WordPress lab must still work.
