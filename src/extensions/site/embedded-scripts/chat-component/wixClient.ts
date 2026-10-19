// wixClient.ts
import { createClient, OAuthStrategy } from "@wix/sdk";
import { site } from "@wix/site";
import { subscriber } from "@wix/realtime";

const applicationId = "bbc0bfe8-5b30-405a-b400-71cfe51f8ad5";
const recaptchaAuth = OAuthStrategy({ clientId: applicationId });

export const wixRecaptchaVisibleSiteKey = recaptchaAuth.captchaVisibleSiteKey;

export const myWixClient = createClient({
  modules: { subscriber },
  auth: site.auth(),
  host: site.host({ applicationId }),
});

export const injectAccessTokenFunction = myWixClient.auth.getAccessTokenInjector();
