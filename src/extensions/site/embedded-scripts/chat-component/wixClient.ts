// wixClient.ts
import { createClient, OAuthStrategy } from "@wix/sdk";
import { site } from "@wix/site";
import { subscriber } from "@wix/realtime";

const applicationId = "90136a5c-0752-4121-8520-78063fefafc6";
const recaptchaAuth = OAuthStrategy({ clientId: applicationId });

export const wixRecaptchaVisibleSiteKey = recaptchaAuth.captchaVisibleSiteKey;

export const myWixClient = createClient({
  modules: { subscriber },
  auth: site.auth(),
  host: site.host({ applicationId }),
});

export const injectAccessTokenFunction = myWixClient.auth.getAccessTokenInjector();
