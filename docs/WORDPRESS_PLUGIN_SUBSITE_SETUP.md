# WordPress Plugin Subsite Setup

This is the correct target for the plugin-testing system: a real WordPress subsite with a `/wp-admin` login where plugin ZIP files can be uploaded and tested.

This is not a static TechMaxxed page.

## Target

Use a dedicated subdomain such as:

```text
plugins.techmaxxed.com
```

or:

```text
wp-lab.techmaxxed.com
```

Expected admin URL:

```text
https://plugins.techmaxxed.com/wp-admin
```

## Purpose

- Log into WordPress admin.
- Upload Maxxed plugin ZIP files through Plugins > Add New > Upload Plugin.
- Activate and test one plugin at a time.
- Keep test content, plugin reports, screenshots, and notes away from the public TechMaxxed static site.
- Promote a plugin to a public TechMaxxed product/subsite only after it passes this WordPress lab.

## Hosting Setup

### Hostinger / managed WordPress path

1. Create a subdomain such as `plugins.techmaxxed.com`.
2. Install a fresh WordPress instance on that subdomain.
3. Use a unique administrator username. Do not use `admin`.
4. Use a generated password and store it in the password manager.
5. Set Search Engine Visibility to discourage indexing.
6. Install only testing-required plugins.
7. Upload the Maxxed lab guard MU plugin from `wordpress-lab/mu-plugins/maxxed-plugin-lab-guard.php`.
8. Add a small set of disposable test posts/pages.
9. Upload and test plugin ZIPs one at a time.

### VPS / Docker path

The existing local Docker harness remains useful for local validation before a plugin reaches the hosted WordPress subsite.

Use:

```powershell
npm run wordpress:lab
npm run wordpress:manifest -- wordpress/products.example.json
```

## Required Hardening

Before uploading any plugin ZIPs to a hosted WordPress lab:

- Enable HTTPS.
- Use a non-obvious admin username.
- Use a generated password.
- Enable two-factor auth if available.
- Disable XML-RPC unless a required test explicitly needs it.
- Add `DISALLOW_FILE_EDIT` in `wp-config.php`.
- Keep the subsite out of the public sitemap.
- Add `noindex,nofollow` headers or the lab guard MU plugin.
- Do not install untrusted third-party plugins into the lab.
- Do not connect production customer data.

## Plugin Upload Flow

1. Build the plugin ZIP from its repo.
2. Open the WordPress lab admin.
3. Go to Plugins > Add New > Upload Plugin.
4. Upload the ZIP.
5. Activate the plugin.
6. Check admin screens.
7. Check public pages.
8. Run plugin-specific acceptance checks.
9. Export or record evidence.
10. Deactivate/remove failed plugins before testing the next ZIP.

## Promotion Flow

A plugin can receive a public TechMaxxed product/subsite page only after:

- ZIP installs cleanly.
- ZIP activates cleanly.
- Admin remains usable.
- Public site remains usable.
- Product admin page loads.
- Destructive actions have preview, confirmation, and recovery where relevant.
- Plugin-specific tests are documented.
- Privacy/support copy is ready.

## What Was Removed

A static public `/tools/wordpress-plugin-lab/` page was intentionally removed. The plugin lab is a real WordPress subsite/admin workflow, not a public static page.
