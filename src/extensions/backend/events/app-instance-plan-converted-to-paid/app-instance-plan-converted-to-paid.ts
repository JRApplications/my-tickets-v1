import { appInstances } from '@wix/app-management';

export default appInstances.onAppInstancePlanConvertedToPaid((event) => {
  console.info('My Tickets plan converted to paid', {
    instanceId: event.metadata.instanceId ?? null,
  });
});
