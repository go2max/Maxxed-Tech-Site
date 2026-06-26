# WordPress Stale Branch Cleanup

These remote branches were still present after the WordPress harness work was merged into `main`:

- `codex/wp-docs-003`
- `codex/wp-harness-clean-001`
- `codex/wp-harness-expansion-001`
- `codex/wp-runner-002`
- `codex/wp-runner-ci-005`

## Status

- The useful work from these lanes has been rebuilt into clean PRs and merged.
- `codex/wp-harness-expansion-001` was the noisy draft branch and should remain unmerged.
- The GitHub connector available in this workspace did not expose a safe branch-delete operation.

## Cleanup command

Run from a machine with normal GitHub push permissions:

```bash
git push origin --delete codex/wp-docs-003 codex/wp-harness-clean-001 codex/wp-harness-expansion-001 codex/wp-runner-002 codex/wp-runner-ci-005
```

Then verify no WordPress work branches remain:

```bash
git ls-remote --heads origin 'codex/wp*'
```
