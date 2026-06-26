# WordPress Product Runner Specification

## Goal

Run repeatable local checks against WordPress plugin and theme artifacts from the canonical website repo.

## Inputs

- Product manifest JSON
- Local plugin/theme ZIP artifacts
- Running Docker Desktop environment
- Existing WordPress local harness

## Output

- Markdown report under `wordpress/reports/`
- Per-product passed, failed, or skipped status
- Notes for missing artifacts or manual follow-up

## Runner command

```bash
npm run wordpress:manifest -- local-artifacts/wordpress/products.local.json
```

If no manifest path is provided, the runner reads `wordpress/products.example.json`.

## Runner behavior

For each product in the manifest:

1. Validate required fields.
2. Confirm the artifact path exists.
3. Select plugin or theme install lane.
4. Install the artifact.
5. Activate when requested.
6. Append result row to a report.
7. Return non-zero only when an attempted install fails.

## Guardrails

- Missing artifacts are skipped, not treated as repository failures.
- Failed installs return a non-zero status.
- Generated reports stay local under ignored `wordpress/reports/`.
- The runner never requires production credentials.
- The committed example manifest is safe to run even without local artifacts.
