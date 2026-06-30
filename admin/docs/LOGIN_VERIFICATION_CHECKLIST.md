# Admin login verification checklist

Use this checklist before connecting live admin boards.

## Required checks

- Protect the admin subsite at the hosting or proxy layer.
- Open the admin subsite in a private browser and confirm the prompt appears before the page loads.
- Confirm direct admin page URLs also require the same prompt.
- Keep admin pages out of public navigation and sitemap files.
- Store the credential record in 1Password.
- Connect backend-powered boards only after the access layer is verified.

## Reference files

- `admin/AUTH_DEPLOYMENT.md`
- `admin/.htaccess.example`
- `admin/contracts/README.md`

## Notes

A browser-only login screen is not enough for this admin subsite. The protection must happen before static files or future backend routes are served.
