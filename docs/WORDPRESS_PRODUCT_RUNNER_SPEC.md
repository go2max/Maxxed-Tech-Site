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
- Per-product pass, fail, or skipped status
- Notes for missing artifacts or manual follow-up

## Runner behavior

For each product in the manifest:

1. Validate required fields.
2. Confirm the artifact path exists.
3. Select plugin or theme install lane.
4. Install the artifact.
5. Activate when requested.
6. Run smoke checks.
7. Append result row to a report.

## Guardrails

- Missing artifacts should be skipped, not treated as repository failures.
- Failed installs should return a non-zero status.
- Generated reports should stay local.
- The runner must never require production credentials.
