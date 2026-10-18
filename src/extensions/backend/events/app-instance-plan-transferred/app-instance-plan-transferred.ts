import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePlanTransferred((event) => {
  console.info('My Tickets plan transferred', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
