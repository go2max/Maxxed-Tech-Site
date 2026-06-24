# Versioned Knowledge Base Operations

## Purpose

The private knowledge base stores operational articles as immutable revisions. Editors create drafts, submit them for review, and authorized publishers approve a specific revision. Publishing copies only that approved revision into the current article record.

## Roles

- Users with `docs.read` can view articles and revision metadata.
- Users with `docs.edit` can create drafts and submit revisions.
- Users with `docs.publish` can publish submitted revisions and archive articles.
- A revision author cannot approve that same revision.

Every create, submit, publish, and archive transition is appended to the platform audit chain.

## Workflow

1. Open `/knowledge-base`.
2. Create a draft with a stable lowercase slug, title, section, classification, audience, optional product ID, change summary, and article body.
3. Submit the immutable revision for review.
4. A different authorized publisher reviews and publishes that exact revision.
5. Create another draft using the same slug for subsequent changes. Earlier revisions remain unchanged.
6. Archive the article when it should no longer be active.

The legacy `/docs/publish` endpoint is retained for existing internal automation, but it accepts only the `internal` publication state. Public content must use the reviewed revision workflow.

## Classification

- `internal`: general company operations.
- `confidential`: restricted operational or security material.
- `public`: approved content intended for public distribution.

A public classification must use a public audience. A public audience must use a public classification. This prevents accidental mixed-scope records.

## Safety Boundaries

- Article content is escaped when rendered; stored HTML is never executed in the workspace.
- Mutations require trusted identity, permission checks, a valid session, same-origin requests, and CSRF tokens.
- Request and field limits bound title, summary, slug, product ID, and body sizes.
- Drafts never replace the currently published article.
- Invalid state transitions fail with a conflict response.
- D1 uniqueness enforces one revision number per article.
- Audit history remains append-only.

## Recovery

If publication is incorrect, create and approve a corrective revision or archive the article. Do not edit D1 records directly. For database recovery, follow `PLATFORM_ROLLBACK_STRATEGY.md` and verify the audit chain after restoration.
