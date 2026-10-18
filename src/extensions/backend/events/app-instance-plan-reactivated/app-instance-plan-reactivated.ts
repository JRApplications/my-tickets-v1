import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePlanReactivated((event) => {
  console.info('My Tickets plan reactivated', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
