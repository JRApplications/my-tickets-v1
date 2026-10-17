import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstanceInstalled((event) => {
  console.info('My Tickets app instance installed', {
    instanceId: event.metadata.instanceId ?? null,
    originInstanceId: event.data.originInstanceId ?? null,
  });
});
