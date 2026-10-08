import { myWixClient } from "./wixClient";

// Keep realtime and REST calls on the Wix client whose access-token injector
// is exported by chat-embed.ts.
export const RealtimeSubscriptionClient = myWixClient;
