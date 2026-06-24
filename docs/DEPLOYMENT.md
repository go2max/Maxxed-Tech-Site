# Deployment Notes

- The public website is deployed from the repository root build artifacts.
- The private platform is a separate Worker under `platform/` and must stay on a separate hostname.
- The local runner remains operator-managed and is not deployed as a public service.
- Production identity configuration, database provisioning, artifact storage, and real integrations remain external operator gates.
