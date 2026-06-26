# Admin Product Management

Products are data-driven. The dashboard uses product records instead of hard-coded UI rows.

## Add a product

Required fields:

- name
- slug
- category
- lifecycle

Optional fields:

- package ID
- public URL
- privacy URL
- support URL
- Play URL
- latest version name/code
- status notes

Adding a product requires `canManageProducts` and writes a `product.add` audit event.

## Archive/remove a product

Product removal is implemented as archive, not destructive deletion. Archiving requires a reason, hides the product from default dashboard views, preserves release/support/audit history, and writes `product.archive`.

## Restore a product

Restoring a product clears archive metadata and writes `product.restore`.

## Source status

Unknown or unavailable data must use explicit states such as `not_configured`, `unavailable`, `insufficient_data`, or `not_run`. Do not show missing integration data as zero.
