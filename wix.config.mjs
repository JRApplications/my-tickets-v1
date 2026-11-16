// @ts-check
import { defineWixConfig } from "@wix/cli/config";
import customExtensions from "@wix/custom-extensions/flow";
import zeroConfig from "@wix/cli-zero-config-flow";

const appId = 'bbc0bfe8-5b30-405a-b400-71cfe51f8ad5'

export default defineWixConfig({
  flows: [
    customExtensions({
      appId,
      projectId: 'my-tickets-v1',
      namespace: '@joshrobertswebsites/my-tickets-v1',
      codeIdentifier: 'my_tickets_v_1',
    }),
    zeroConfig({ appId }),
  ],
});
