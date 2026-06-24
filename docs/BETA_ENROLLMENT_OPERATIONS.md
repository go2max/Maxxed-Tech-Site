# Beta Enrollment Operations

## Purpose

The beta workflow keeps tester admission manual, auditable, and reversible while preparing clean integration points for Google Groups and Google Play testing tracks.

## Code Boundary

Implemented code covers:

- validation for beta submissions and consent state
- manual review and approval state transitions
- invitation, approval, enrollment, track sync, removal, consent, credit, correction, and deletion event types
- deterministic enrollment plans per product interest
- disabled-by-default Google Workspace and Google Play adapters
- persisted migration tables for beta events, Play track sync attempts, and tester data requests

The code does not include live Google credentials. Production credentials, Google Groups, Play Console track configuration, and mailbox activation remain external setup gates.

## Manual Review Procedure

1. Open the private beta applications admin area.
2. Confirm the tester email is valid and not duplicated against known rejected or removed testers.
3. Confirm app interests match currently supported Android testing tracks.
4. Confirm device details are plausible for the target app.
5. Confirm unpaid participation and public-credit consent are recorded separately.
6. Approve or reject the application.
7. Only after approval, queue group enrollment and Play track synchronization.
8. Record every invitation, approval, enrollment, removal, consent, and credit decision as a beta enrollment event.

## Google Groups and Play Tracks

Each app-specific track maps to an approved Google Group. A typical mapping is:

- `maxxed-remote` -> `maxxed-remote-beta@groups.techmaxxed.com`
- `maxxed-compass` -> `maxxed-compass-beta@groups.techmaxxed.com`
- `maxxed-measure` -> `maxxed-measure-beta@groups.techmaxxed.com`
- `maxxed-gold-estimator` -> `maxxed-gold-estimator-beta@groups.techmaxxed.com`
- `fishing-maxxed` -> `fishing-maxxed-beta@groups.techmaxxed.com`
- `rival-rush` -> `rival-rush-beta@groups.techmaxxed.com`

Production setup must use a minimum-scope Google Workspace service account and a separate Google Play service account. Do not store JSON keys in the repository.

## Privacy Requests

Tester data correction and deletion requests are recorded as durable `beta_data_requests` rows. A deletion request should also queue tester removal from every group and Play track before the application record is minimized or removed according to the approved retention procedure.

## Public Credits

Public tester credits require separate opt-in consent and verification. Revoking public-credit consent must withdraw the display state without affecting the tester's ability to remain in beta testing.
