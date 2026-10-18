import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePaidPlanAutoRenewalCancelled((event) => {
  console.info('My Tickets paid plan auto-renewal cancelled', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
