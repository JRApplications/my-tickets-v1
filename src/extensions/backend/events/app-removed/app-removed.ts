import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstanceRemoved((event) => {
  console.info('My Tickets app instance removed', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
