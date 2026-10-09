// @ts-check
import { defineConfig, envField } from 'astro/config';
import wix from '@wix/astro';
import react from "@astrojs/react";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";

export default defineConfig({
  output: "server",
  adapter: wixHostingAdapter(),
  integrations: [wix(), react()],
  image: { domains: ["static.wixstatic.com"] },
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  vite: {
    server: {
      cors: true,
    },
  },
  env: {
    schema: {
      RESET_SECRET: envField.string({ context: "server", access: "secret" }),
      SENTRY_DSN: envField.string({ context: "server", access: "secret" }),
      WIX_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GITHUB_SKILLS_TOKEN: envField.string({ context: "server", access: "secret" }),
      MY_TICKETS_AUTH_SECRET: envField.string({ context: "server", access: "secret" }),
      BASE_44_MY_TICKETS_BACKEND_MANAGER: envField.string({ context: "server", access: "secret" }),
      MY_TICKETS_ACCOUNT_AI_API_KEY: envField.string({ context: "server", access: "secret" })
    },
  },
});
