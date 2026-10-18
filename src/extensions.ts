import { app } from '@wix/astro/builders';

import myTickets from './extensions/dashboard/pages/my-tickets/my-tickets.extension.ts';

// import myTicketsRtPro from './extensions/backend/service-plugins/my-tickets-rt-pro/my-tickets-rt-pro.extension.ts';

import chatComponent from './extensions/site/embedded-scripts/chat-component/chat-component.extension.ts';

import memberTicketsThemeComponent from './extensions/site/embedded-scripts/member-tickets-theme-component/member-tickets-theme-component.extension.ts';

import memberTickets from './extensions/site/widgets/member-tickets/member-tickets.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

import resetPasswordTopic from './extensions/backend/notifications/topics/reset-password.extension.ts';
import resetPasswordUserNotification from './extensions/backend/notifications/user-notifications/reset-password.extension.ts';

import appLifecycle from './extensions/backend/events/app-lifecycle/app-lifecycle.extension.ts';

import appRemoved from './extensions/backend/events/app-removed/app-removed.extension.ts';
import appSkills from './extensions/backend/app-skills/app-skills.extension.ts';

import appInstancePaidPlanAutoRenewalCancelled from './extensions/backend/events/app-instance-paid-plan-auto-renewal-cancelled/app-instance-paid-plan-auto-renewal-cancelled.extension.ts';
import appInstancePaidPlanChanged from './extensions/backend/events/app-instance-paid-plan-changed/app-instance-paid-plan-changed.extension.ts';
import appInstancePaidPlanPurchased from './extensions/backend/events/app-instance-paid-plan-purchased/app-instance-paid-plan-purchased.extension.ts';
import appInstancePlanConvertedToPaid from './extensions/backend/events/app-instance-plan-converted-to-paid/app-instance-plan-converted-to-paid.extension.ts';
import appInstancePlanReactivated from './extensions/backend/events/app-instance-plan-reactivated/app-instance-plan-reactivated.extension.ts';
import appInstancePlanTransferred from './extensions/backend/events/app-instance-plan-transferred/app-instance-plan-transferred.extension.ts';

export default app()
  .use(myTickets)
  // .use(myTicketsRtPro)
  .use(chatComponent)
  .use(memberTicketsThemeComponent)
  .use(memberTickets)
  .use(dataCollections)
  .use(resetPasswordTopic)
  .use(resetPasswordUserNotification)
  .use(appLifecycle)
  .use(appRemoved)
  .use(appSkills)
  .use(appInstancePaidPlanAutoRenewalCancelled)
  .use(appInstancePaidPlanChanged)
  .use(appInstancePaidPlanPurchased)
  .use(appInstancePlanConvertedToPaid)
  .use(appInstancePlanReactivated)
  .use(appInstancePlanTransferred);
