import { app } from '@wix/astro/builders';

import myTickets from './extensions/dashboard/pages/my-tickets/my-tickets.extension.ts';

// import myTicketsRtPro from './extensions/backend/service-plugins/my-tickets-rt-pro/my-tickets-rt-pro.extension.ts';

import chatComponent from './extensions/site/embedded-scripts/chat-component/chat-component.extension.ts';

import memberTicketsThemeComponent from './extensions/site/embedded-scripts/member-tickets-theme-component/member-tickets-theme-component.extension.ts';

import memberTickets from './extensions/site/widgets/member-tickets/member-tickets.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

import resetPasswordTopic from './extensions/backend/notifications/topics/reset-password.extension.ts';
import resetPasswordUserNotification from './extensions/backend/notifications/user-notifications/reset-password.extension.ts';

export default app()
  .use(myTickets)
  // .use(myTicketsRtPro)
  .use(chatComponent)
  .use(memberTicketsThemeComponent)
  .use(memberTickets)
  .use(dataCollections)
  .use(resetPasswordTopic)
  .use(resetPasswordUserNotification);
