// @ts-check
import { defineWixConfig } from '@wix/cli/config';

export default defineWixConfig({
  config: {
    projectType: 'App',
    appId: 'bbc0bfe8-5b30-405a-b400-71cfe51f8ad5',
    projectId: 'my-tickets-v1',
    namespace: '@joshrobertswebsites/my-tickets-v1',
    codeIdentifier: 'my_tickets_v_1',
  },
});
