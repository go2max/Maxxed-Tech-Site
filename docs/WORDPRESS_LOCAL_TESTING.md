# WordPress Local Testing

This is the local WordPress harness for testing Maxxed website/app WordPress work from the canonical website repo.

Canonical repo: `go2max/Maxxed-Tech-Site`

Do not put website-level WordPress testing infrastructure into individual plugin repos unless a plugin needs its own isolated harness.

## What this provides

- WordPress 6.6 on PHP 8.3
- MySQL 8.4
- WP-CLI
- phpMyAdmin
- Local mount points for website plugins, themes, and uploads

## Directory layout

```text
wordpress/plugins/   # local plugin work or copied plugin builds
wordpress/themes/    # local theme work
wordpress/uploads/   # local uploads/test media
```

These are mounted into the running WordPress container under `wp-content`.

## First run

```bash
cp .env.wordpress.example .env.wordpress
chmod +x tools/wordpress/*.sh
./tools/wordpress/bootstrap.sh
```

Open:

- WordPress: <http://localhost:8080>
- Admin: <http://localhost:8080/wp-admin>
- phpMyAdmin: <http://localhost:8081>

Default local login from `.env.wordpress.example`:

- Username: `admin`
- Password: `adminpass123`

These credentials are for local development only.

## Smoke test

```bash
./tools/wordpress/smoke-test.sh
```

The smoke test starts the stack, installs WordPress if needed, verifies the site URL, lists plugins, and lists themes.

## Reset everything

```bash
./tools/wordpress/reset.sh
```

This removes the WordPress and database Docker volumes. Use this when you want a clean test site.

## Manual commands

Start services:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress up -d
```

Run WP-CLI:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress run --rm wpcli plugin list
```

View debug log:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress exec wordpress tail -f /var/www/html/wp-content/debug.log
```

Stop services:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress down
```

## Testing a plugin from another repo

Copy the plugin folder or release ZIP contents into:

```text
wordpress/plugins/<plugin-folder-name>
```

Then activate it:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress run --rm wpcli plugin activate <plugin-folder-name>
```

## Testing a theme

Copy the theme into:

```text
wordpress/themes/<theme-folder-name>
```

Then activate it:

```bash
docker compose -f docker-compose.wordpress.yml --env-file .env.wordpress run --rm wpcli theme activate <theme-folder-name>
```

## Notes

This environment is local-only and is not production hosting. It exists to quickly test WordPress app/plugin/theme behavior before packaging or deploying anything public.
