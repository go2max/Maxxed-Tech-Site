# Admin Environment

Real secret values must live in hosted secret storage, never in source control.

| Variable | Purpose |
| --- | --- |
| `ADMIN_ENV` | `development`, `staging`, or `production`. |
| `ADMIN_HOSTNAME` | Expected private hostname, usually `admin.techmaxxed.com`. |
| `ADMIN_ALLOW_MOCK_IDENTITY` | Enables local mock identity only outside production. |
| `ADMIN_MOCK_EMAIL` | Local-only mock identity email. |
| `ADMIN_MOCK_ROLES` | Local-only comma-separated mock roles. |
| `ADMIN_DATABASE_URL` | Local SQLite-style database URL or file hint. |
| `ADMIN_D1_BINDING` | Cloudflare D1 binding name. |
| `ADMIN_R2_EVIDENCE_BUCKET` | Evidence storage bucket binding/name. |
| `ADMIN_GOOGLE_PLAY_PROJECT_ID` | Google Play integration project identifier. |
| `ADMIN_GOOGLE_WORKSPACE_CUSTOMER_ID` | Workspace/Groups integration customer ID. |
| `ADMIN_SUPPORT_MAILBOX` | Support mailbox address. |
| `ADMIN_BETA_MAILBOX` | Beta mailbox address. |
| `ADMIN_PRIVACY_MAILBOX` | Privacy mailbox address. |

`ADMIN_ALLOW_MOCK_IDENTITY=true` is forbidden when `ADMIN_ENV=production`.
