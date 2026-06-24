# Maxxed Sequential APK Runner

The runner is a local Windows-first tool for dry runs and sequential APK test
jobs. Approved script-pack manifests are bound to the detected product package
ID, executed in isolated child processes, and protected by cross-process lease
state. Package IDs for real products must still be configured locally; they are
not stored in Git.
