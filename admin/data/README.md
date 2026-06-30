# Admin data scaffolding

This folder is for static admin configuration that can be edited without rewriting the admin page.

## Current file

- `admin-boards.json` defines support routes, admin modules, and launch-readiness rows.

## Keep this folder static-safe

Use only public or low-risk operational metadata here:

- Public product names
- Public domain names
- Public support inboxes
- General board statuses
- Non-sensitive next actions

Do not store private operational details in this folder. Anything that requires restricted access should come from an authenticated backend after the admin subsite has real access control.

## Adding a new board/module

Add an object to `modules`:

```json
{
  "id": "new-board-id",
  "label": "New Board Label",
  "status": "planned",
  "owner": "operations",
  "description": "What this board tracks."
}
```

## Adding a launch row

Add an object to `launchReadiness`:

```json
{
  "product": "Product Name",
  "type": "Android app",
  "stage": "active-build",
  "nextAction": "Next safe public action",
  "risk": "Non-sensitive risk summary",
  "supportEmail": "support@techmaxxed.com"
}
```

When the admin backend is authenticated, this JSON can be replaced or supplemented by a server response. Until then, keep it safe for static hosting.
