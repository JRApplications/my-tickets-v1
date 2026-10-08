import { realtimePermissionsProvider } from '@wix/realtime/service-plugins';

realtimePermissionsProvider.provideHandlers({
  checkSubscriberPermissions: async ({ request, metadata }) => {
    return {
      read: true,
      write: true,
    };
  },
});
