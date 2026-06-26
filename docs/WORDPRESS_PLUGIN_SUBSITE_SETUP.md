# WordPress Plugin Subsite Setup

This is the correct target for the plugin-testing system: a real WordPress subsite running on the server with a `/wp-admin` login where plugin ZIP files can be uploaded and tested.

This is not a static TechMaxxed page, and it must not rely on a local PC, Docker Desktop, localhost, or a tunnel staying online.

## Operating Model

Primary environment:

```text
Hosted WordPress subsite on the TechMaxxed server
```

Expected admin URL:

```text
https://plugins.techmaxxed.com/wp-admin
```

Acceptable alternate admin URL:

```text
https://wp-lab.techmaxxed.com/wp-admin
```

Local Docker is optional preflight only. It is not the WordPress lab of record.

## Purpose

- Log into WordPress admin on the hosted subsite.
- Upload Maxxed plugin ZIP files through Plugins > Add New > Upload Plugin.
- Activate and test one plugin at a time.
- Keep test content, plugin reports, screenshots, and notes away from the public TechMaxxed static site.
- Promote a plugin to a public TechMaxxed product/subsite only after it passes this hosted WordPress lab.

## Server Setup

1. Create a dedicated subdomain such as `plugins.techmaxxed.com` or `wp-lab.techmaxxed.com`.
2. Point DNS to the hosting/server environment.
3. Install a fresh WordPress instance on that subdomain.
4. Enable HTTPS before uploading any plugins.
5. Create a unique administrator username. Do not use `admin`.
6. Use a generated password and store it in the password manager.
7. Set Search Engine Visibility to discourage indexing.
8. Add the Maxxed lab guard MU plugin from `wordpress-lab/mu-plugins/maxxed-plugin-lab-guard.php`.
9. Add disposable test posts/pages.
10. Upload and test plugin ZIPs one at a time.

## Required Hardening

Before uploading any plugin ZIPs to the hosted WordPress lab:

- Enable HTTPS.
- Use a non-obvious admin username.
- Use a generated password.
- Enable two-factor auth if available.
- Disable XML-RPC unless a required test explicitly needs it.
- Add `DISALLOW_FILE_EDIT` in `wp-config.php`.
- Keep the subsite out of the public sitemap.
- Add `noindex,nofollow` headers through the lab guard MU plugin or server config.
- Do not install untrusted third-party plugins into the lab.
- Do not connect production customer data.

## Login Flow

1. Open `https://plugins.techmaxxed.com/wp-admin` or the chosen hosted lab URL.
2. Sign in with the lab administrator account.
3. Confirm the dashboard shows the lab guard notice.
4. Go to Plugins > Add New > Upload Plugin.
5. Upload the plugin ZIP.
6. Activate the plugin.
7. Run the product-specific test checklist.

## Plugin Upload Flow

1. Build the plugin ZIP from its repo.
2. Open the hosted WordPress lab admin.
3. Go to Plugins > Add New > Upload Plugin.
4. Upload the ZIP.
5. Activate the plugin.
6. Check admin screens.
7. Check public pages on the lab subsite.
8. Run plugin-specific acceptance checks.
9. Export or record evidence.
10. Deactivate/remove failed plugins before testing the next ZIP.

## Promotion Flow

A plugin can receive a public TechMaxxed product/subsite page only after:

- ZIP installs cleanly.
- ZIP activates cleanly.
- Admin remains usable.
- Public lab pages remain usable.
- Product admin page loads.
- Destructive actions have preview, confirmation, and recovery where relevant.
- Plugin-specific tests are documented.
- Privacy/support copy is ready.

## Optional Local Preflight

The local Docker harness can still be used before uploading a ZIP to the server, but it is optional and not authoritative.

Use local preflight only for quick install checks:

```powershell
npm run wordpress:lab
npm run wordpress:manifest -- wordpress/products.example.json
```

If local Docker is offline, continue with the hosted WordPress lab.

## What Was Removed

A static public `/tools/wordpress-plugin-lab/` page was intentionally removed. The plugin lab is a real hosted WordPress subsite/admin workflow, not a public static page.
