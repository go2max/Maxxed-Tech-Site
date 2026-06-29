# GitHub App Inventory Audit

Run the portfolio audit against both GitHub owners:

```bash
npm run audit:github-apps
```

The audit compares GitHub repository metadata with the public website catalog,
the private testing catalog, and executable runner references. It writes JSON
and Markdown reports under `reports/` and identifies:

- Catalog apps without a matched repository.
- Website/testing catalog drift.
- Missing executable runner references.
- Multiple repositories mapped to one app.
- Ambiguous or likely app repositories that are not yet mapped.

Public repositories can be checked without credentials. Set `GITHUB_TOKEN` to
include repositories visible to that token and increase the API rate limit. Do
not commit the token.

For deterministic CI or offline validation, provide a saved GitHub repository
array:

```bash
node scripts/audit-github-apps.mjs --input path/to/repos.json
```

Use `--fail-on-unmapped` when every likely product repository must already be
classified. Unmapped candidates are warnings by default because repository
names and descriptions alone cannot prove that a repository is a distinct app.

Approved classifications live in `content/repository-classifications.json` and
are mirrored into the Repository Candidates sheet in the master 612-product
workbook. CI runs the saved 69-repository inventory in strict mode so a new
unclassified app-like repository cannot be silently ignored.
