# Maxxed Technical Systems Website

Company app catalog for Maxxed Technical Systems. It includes a normal static
`index.html` and a Cloudflare Worker ES module prepared for Sites hosting.

## Included products

- Maxxed Remote
- Maxxed Compass
- Maxxed Measure
- Maxxed Gold Estimator
- Fishing Maxxed
- Rival Rush
- Planned business and field tools roadmap

## Build and validate

```powershell
npm run build
node scripts/validate-artifact.mjs
```

The cross-platform build works in Windows PowerShell, macOS, and Linux. The
deployable Worker artifact is written to `dist/`, while `index.html` can be
opened directly or uploaded to any static website host.
