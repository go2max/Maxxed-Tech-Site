# WordPress Server Lab Checklist

Use this checklist to create the WordPress plugin-testing lab on the server. The lab must keep working when the local PC is offline.

## Target

Preferred URL:

```text
https://plugins.techmaxxed.com/wp-admin
```

Fallback URL:

```text
https://wp-lab.techmaxxed.com/wp-admin
```

## Provisioning

- Create the subdomain in hosting/DNS.
- Install a fresh WordPress instance on that subdomain.
- Enable HTTPS.
- Create a unique administrator account.
- Store the username and generated password in the password manager.
- Set Settings > Reading > Search Engine Visibility to discourage indexing.
- Confirm the site is not linked from the public TechMaxxed sitemap or navigation.

## Hardening

- Install the MU guard plugin at `wp-content/mu-plugins/maxxed-plugin-lab-guard.php`.
- Add `define('DISALLOW_FILE_EDIT', true);` to `wp-config.php`.
- Disable XML-RPC unless a test requires it.
- Enable two-factor auth if the host supports it.
- Do not connect production customer data.
- Do not install untrusted third-party plugins.

## Verification

- Open `/wp-admin` on the hosted subdomain.
- Confirm the dashboard loads over HTTPS.
- Confirm the lab guard notice appears in admin.
- Confirm `/wp-json/maxxed-lab/v1/health` returns a WordPress lab response.
- Confirm public pages include noindex behavior.
- Upload one known plugin ZIP through Plugins > Add New > Upload Plugin.
- Activate the plugin and verify admin/public screens still load.

## Testing Policy

- Test one plugin ZIP at a time.
- Remove failed plugins before the next test.
- Record plugin name, version, ZIP filename, install result, activation result, admin result, and public result.
- Promote public TechMaxxed pages only after the hosted lab test passes.

## Local Is Optional

The local Docker harness is useful for development preflight. It is not required for the hosted WordPress lab to run and must not be used as the source of truth for plugin acceptance.
