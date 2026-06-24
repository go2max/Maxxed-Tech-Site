import { createPlatformApp } from "../src/app.mjs";

const app = createPlatformApp();

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};
