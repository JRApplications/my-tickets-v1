import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePaidPlanChanged((event) => {
  console.info('My Tickets paid plan changed', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
