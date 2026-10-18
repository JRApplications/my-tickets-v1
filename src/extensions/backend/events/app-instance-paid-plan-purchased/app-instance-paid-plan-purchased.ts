import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePaidPlanPurchased((event) => {
  console.info('My Tickets paid plan purchased', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
