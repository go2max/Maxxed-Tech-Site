import { createPlatformApp } from "./src/app.mjs";

const app = createPlatformApp();

export default {
  fetch(request, env) {
    return app.fetch(request, env);
  },
  scheduled(event, env, context) {
    context.waitUntil(app.scheduled(event, env));
  },
};
