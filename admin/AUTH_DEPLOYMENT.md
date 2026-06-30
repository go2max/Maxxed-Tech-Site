# Immediate admin login deployment

The admin portal is a subsite/static export, so the real login process must be enforced at the hosting/proxy layer before any backend data is connected.

## Required immediate setup

Use one of these before merging any live admin API wiring:

1. **Hostinger password-protected directory** for `/public_html/admin`.
2. **Cloudflare Access** rule for `admin.techmaxxed.com/*` and any `/admin/*` path.
3. **Apache Basic Auth** with `.htpasswd` stored outside the web root.

Do not rely on a JavaScript login form for security. Browser-side login gates only hide UI; they do not protect files, API routes, or source content.

## Hostinger password-protected directory path

Recommended immediate setup:

1. Open Hostinger hPanel.
2. Go to **Advanced** or **Security**.
3. Open **Password Protect Directories**.
4. Select the admin directory, usually `/public_html/admin` or the document root for the admin subdomain.
5. Create a unique admin username.
6. Generate a strong password in 1Password.
7. Store the credential in 1Password under `TechMaxxed Admin Portal`.
8. Confirm that `https://admin.techmaxxed.com/` prompts for login in a private/incognito browser.

## Cloudflare Access path

Recommended medium-term setup:

- Application: `TechMaxxed Admin`
- Protected host: `admin.techmaxxed.com`
- Protected paths: `/*`
- Policy: allow only approved owner/admin emails
- Session duration: short enough for admin use, for example 12 hours
- Require MFA on the identity provider if available

## Apache Basic Auth template

If using Apache directly, copy `admin/.htaccess.example` to the deployed admin directory as `.htaccess` and update `AuthUserFile` to the real absolute server path for the `.htpasswd` file.

The `.htpasswd` file must not be committed and should live outside public web directories.

## Verification checklist

- `admin.techmaxxed.com` requires login before showing any admin HTML.
- `/admin/` requires login if the admin is also reachable under the main site.
- Direct file paths under admin require login.
- Admin pages are not linked from public navigation.
- Admin pages are not in sitemap files.
- Admin pages return noindex headers.
- No secrets are present in HTML, JS, JSON, Markdown, comments, or deployment headers.
