import { validateAdminProductionConfig } from "./production-config.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const validation = validateAdminProductionConfig(env || {});
      return Response.json({
        service: "maxxed-admin-platform",
        ok: validation.ok || validation.config.envName !== "production",
        env: validation.config.envName,
        host: validation.config.publicHost,
        accessRequired: validation.config.requireAccess,
        mockIdentityEnabled: validation.config.allowMockIdentity,
        d1Configured: validation.config.hasD1Binding,
        evidenceBucketConfigured: validation.config.hasEvidenceBucket,
      }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return new Response("Maxxed Admin Platform", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      }
    });
  }
};
