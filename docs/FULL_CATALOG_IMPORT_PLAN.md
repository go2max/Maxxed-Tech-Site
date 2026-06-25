# Full Catalog Import Plan

The larger Maxxed product catalog should be imported from canonical shared-SDK catalog files instead of being manually invented inside static HTML.

## Canonical sources to import

- `catalog/BUILD_QUEUE.csv`
- `catalog/UPDATED_PRODUCT_CATALOG.csv`
- `catalog/UPDATED_PRODUCT_CATALOG.xlsx`
- `docs/PORTFOLIO_STATUS.md`
- `docs/NEXT_BUILD_ROADMAP.md`

## Public status buckets

1. `Ready candidate` — built/merged/CI-green/device-tested enough to market honestly, but may still need final staging or release checks.
2. `Android release candidate` — Android build/test/device evidence exists; Play Store/store links may still be pending.
3. `Internal testing` — usable for tester recruitment, not public-release language.
4. `Functional debug` — implemented baseline exists, but not production-ready.
5. `Prototype` — useful to collect interest, but not a ready product.
6. `Hold / verify` — promising, but blocked by unresolved CI/deployment/store/build verification.
7. `Requestable` — can switch focus quickly if someone asks, but should not be described as launched.
8. `Pipeline` — catalog visibility only.

## Import behavior

- Preserve the evidence-backed ready list first.
- Add catalog entries only after mapping them into one of the public status buckets.
- Never use install, download, or launch language unless a verified URL/build exists.
- Add product pages progressively for high-demand or request-triggered entries.
