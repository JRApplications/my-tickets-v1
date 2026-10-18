import { extensions } from '@wix/astro/builders/trusted';

const skills = [
  {
    slug: 'my-tickets-support',
    displayName: 'Navigate My Tickets',
    description:
      'Helps users find the right screen and understand the navigation in the My Tickets dashboard. Use when someone asks where a feature is, how the dashboard is organized, or which settings page to open.',
    guidelines: `# Navigate My Tickets

Help the user find the right screen in the My Tickets dashboard. Give the exact sidebar path, then briefly explain what they can do there. The dashboard is a Wix app page titled My Tickets.

## Screen map
- Home: the team ticket workload overview and dashboard metrics.
- Create Ticket: the ticket creation flow, opened from the sidebar button.
- Inbox > Tickets: search and filter tickets; open a row to view ticket details.
- Inbox > Chats: view and respond to live customer chats.
- Inbox > Offline Submissions: review submissions received while the team is offline. This item requires the relevant permission.
- Team > Internal Mail: messages for the support team.
- Team > Workforce: team coverage, ticket workload and demand forecast.
- Reports: ticket and service performance. The item and data require report access.
- Settings > Manage Teams: create and manage support teams.
- Settings > Manage Agents: create and manage agent accounts.
- Settings > Roles & Permissions: configure custom roles and access.
- Settings > Site Components > Member Tickets Design: configure the member-facing ticket component.
- Settings > Site Components > Chat Settings: configure chat behavior.
- Settings > Site Components > Chat Widget Design: customize the visitor chat widget's appearance.
- Settings > SLA Settings: configure response and resolution targets and escalation rules.
- Help & Support: send a support request to the My Tickets team.

The sidebar can be minimized; expand it to read full labels. Some items are hidden or restricted according to the signed-in agent's permissions and app plan. If an item is missing, suggest checking with the account administrator rather than assuming the feature is broken. The notification bell is in the sidebar header. My Tickets AI appears in the sidebar footer only when enabled. The profile menu at the bottom contains agent status and sign-out controls.

Give navigation instructions only. Do not claim to open a screen, inspect site data, or change settings for the user. For detailed workflows, route the user to the matching My Tickets skill when available.`,
    activated: true,
    tags: ['navigation', 'dashboard', 'sidebar', 'settings', 'help'],
    examples: [
      'Where do I manage my teams?',
      'How do I get to the chat widget design settings?',
      'Where can I find offline form submissions?',
      'How is the My Tickets dashboard organized?',
      'Where do I change my agent status?',
    ],
  },
  {
    slug: 'work-support-tickets',
    displayName: 'Work with support tickets',
    description:
      'Guides users through finding, creating, reviewing and managing support tickets in My Tickets. Use for ticket inbox, ticket details, replies, assignment, status, priority, tags or merging questions.',
    guidelines: `# Work with support tickets

Guide the user through ticket work in the My Tickets dashboard.

1. Direct them to Inbox > Tickets to search or filter the ticket list. They can create a ticket with Create Ticket in the sidebar if their role and plan allow it.
2. To review a ticket, select its row. The Ticket Details panel includes the conversation, timeline, ownership, tags, merge information and related tickets.
3. Explain the available actions relevant to the request: reply to the customer, add an internal note, change status or priority, assign or transfer ownership, follow or unfollow, update tags, view the member, or merge related tickets. Some actions may require permissions.
4. For a merge, have the user review the primary and related ticket details before confirming; merging changes ticket records.
5. If the ticket is not visible, suggest checking the search text, filters, team scope and permissions. Do not infer that a ticket does not exist from a filtered list.

Use only screens and actions named in the app. Do not say that you opened, searched, changed or merged a ticket. Do not invent ticket contents or claim to access customer records.`,
    activated: true,
    tags: ['tickets', 'inbox', 'ticket details', 'assignment', 'customer support'],
    examples: [
      'Where can I find a ticket?',
      'How do I reply to a customer on a ticket?',
      'How do I assign a ticket to an agent?',
      'Where can I change ticket priority or status?',
      'How do I merge duplicate tickets?',
    ],
  },
  {
    slug: 'handle-customer-chats',
    displayName: 'Handle customer chats',
    description:
      'Helps support agents navigate and manage live customer conversations in My Tickets. Use for finding chats, joining a conversation, replying, transferring a chat or ending it.',
    guidelines: `# Handle customer chats

Guide the user through live chat in My Tickets.

1. Direct them to Inbox > Chats to find customer conversations.
2. Open the relevant conversation to review the exchange and respond. If the chat is waiting for an agent, use the available join action before replying.
3. Use the transfer action when another team or agent should take over. Confirm the intended recipient with the user before advising them to transfer.
4. End a chat only when the conversation is complete; explain that ending the chat closes the live conversation.
5. For chat availability, routing, initial questions or business behavior, direct the user to Settings > Site Components > Chat Settings. For visual styling, use Settings > Site Components > Chat Widget Design.

If the Chats item or an action is unavailable, suggest checking agent permissions and team assignment. Provide navigation guidance only; do not claim to access or operate a live conversation.`,
    activated: true,
    tags: ['chat', 'live chat', 'inbox', 'conversation', 'transfer'],
    examples: [
      'Where do I answer a live chat?',
      'How do I join a customer conversation?',
      'How can I transfer a chat to another team?',
      'How do I end a chat?',
      'Where do I change chat availability settings?',
    ],
  },
  {
    slug: 'review-offline-submissions',
    displayName: 'Review offline submissions',
    description:
      'Shows users where to find and review customer messages submitted while the support team is offline. Use for offline form submissions and their status.',
    guidelines: `# Review offline submissions

1. Direct the user to Inbox > Offline Submissions.
2. Explain that this list contains messages sent through the offline form when the team is unavailable. The page supports reviewing submissions and updating their status.
3. If the item is missing, the agent may need the permission to view offline form submissions. Ask an administrator to check the agent's role.
4. If the list is empty, suggest checking the current filters and date range, if shown. Do not conclude that no submissions exist elsewhere.

Do not claim to read, update or send a response to any submission.`,
    activated: true,
    tags: ['offline submissions', 'offline form', 'inbox', 'customer messages'],
    examples: [
      'Where do offline customer messages go?',
      'How do I find offline form submissions?',
      'Why can’t I see Offline Submissions?',
      'Where can I review a message sent after hours?',
    ],
  },
  {
    slug: 'manage-teams-and-agents',
    displayName: 'Manage teams and agents',
    description:
      'Guides administrators through team setup, agent accounts and role permissions in My Tickets. Use when adding staff, organizing support teams or controlling access.',
    guidelines: `# Manage teams and agents

Use the Settings section of the My Tickets sidebar.

- Open Settings > Manage Teams to create or maintain support teams.
- Open Settings > Manage Agents to create and maintain agent accounts and their team or role assignment.
- Open Settings > Roles & Permissions to create or update roles and choose the access they grant.
- Use Team > Internal Mail for internal messages between support staff; it is separate from customer tickets and chats.

For changes to access, explain that permissions come from the assigned role and that some management features may require an eligible plan. If an item or action is unavailable, suggest asking an administrator to check access and plan limits. Encourage reviewing a role's permissions before assigning it. Do not claim to create accounts, change roles or send messages.`,
    activated: true,
    tags: ['teams', 'agents', 'roles', 'permissions', 'internal mail'],
    examples: [
      'Where do I add a support agent?',
      'How do I create a team?',
      'Where can I change an agent’s permissions?',
      'Where do staff send internal messages?',
      'Why can’t I manage roles?',
    ],
  },
  {
    slug: 'review-workforce-and-coverage',
    displayName: 'Review workforce and coverage',
    description:
      'Helps users understand team coverage, open ticket workload and demand forecasts in My Tickets. Use for staffing and workload questions.',
    guidelines: `# Review workforce and coverage

1. Direct the user to Team > Workforce.
2. Explain that the page summarizes team coverage, online agents, active ticket workload, workload per agent, the busiest agent and a ticket-demand forecast for the next 7 days.
3. The view is scoped to the agent's team unless the agent has broader system administrator access. A permission or plan restriction may prevent access.
4. For historical ticket trends and service performance, direct the user to Reports instead.

Describe what the page shows; do not infer staffing recommendations from figures you cannot see, and do not claim to change agent availability or assignments.`,
    activated: true,
    tags: ['workforce', 'coverage', 'staffing', 'workload', 'forecast'],
    examples: [
      'Where do I see who is online?',
      'How can I check ticket workload by agent?',
      'Where is the ticket demand forecast?',
      'What page helps me plan team coverage?',
    ],
  },
  {
    slug: 'review-ticket-reports',
    displayName: 'Review ticket reports',
    description:
      'Guides users to ticket trends, service levels and team or agent performance reports in My Tickets. Use for historical performance, custom reports or exporting report data.',
    guidelines: `# Review ticket reports

1. Direct the user to Reports in the My Tickets sidebar. This item requires report access.
2. The page includes an overview, ticket trends, service levels, tickets by agent, status and priority, and team performance.
3. To make a custom report, use the custom report section to choose summary metrics and an optional breakdown for the selected period; the page offers download or export actions.
4. If the report is unavailable, check the agent's View Reports permission and the selected period or filters.
5. For changing response or resolution targets, use Settings > SLA Settings instead. Reports display performance; SLA Settings configure the targets.

Do not invent metrics or claim to run or export a report.`,
    activated: true,
    tags: ['reports', 'analytics', 'ticket trends', 'performance', 'export'],
    examples: [
      'Where do I see ticket trends?',
      'How can I compare agent performance?',
      'Where can I export a custom report?',
      'Where do I check service level performance?',
    ],
  },
  {
    slug: 'configure-service-levels',
    displayName: 'Configure service levels',
    description:
      'Shows administrators where to configure My Tickets response and resolution targets, business hours and escalation rules. Use for SLA setup or changes.',
    guidelines: `# Configure service levels

1. Direct the user to Settings > SLA Settings.
2. Explain that the page configures first-response, next-response and resolution targets, the conditions under which the SLA clock runs, and optional rules-based escalation that raises ticket priority after a breach.
3. Recommend reviewing targets and escalation rules before saving changes, since they affect ticket handling and reporting.
4. If the page is unavailable, suggest checking the user's role permissions and app plan.
5. For viewing current service-level performance rather than changing targets, direct the user to Reports.

Do not claim to change SLA settings or promise a response time that is not shown in the app.`,
    activated: true,
    tags: ['sla', 'service levels', 'response targets', 'escalation', 'settings'],
    examples: [
      'Where do I set a first response target?',
      'How do I configure SLA escalation?',
      'Where can I change resolution targets?',
      'Where do I see whether an SLA is being met?',
    ],
  },
  {
    slug: 'configure-site-components',
    displayName: 'Configure site components',
    description:
      'Helps users find the My Tickets member ticket area and customer chat component settings. Use when setting up ticket access on the site or changing chat behavior and appearance.',
    guidelines: `# Configure site components

Open Settings > Site Components in the My Tickets sidebar, then choose the matching page:

- Member Tickets Design configures the member-facing ticket component.
- Chat Settings configures chat behavior, including options such as availability and routing.
- Chat Widget Design configures the visitor-facing chat widget's appearance and preview.

Keep these destinations distinct: behavior belongs in Chat Settings, while visual styling belongs in Chat Widget Design. If the user asks how to place a component on a site page, explain that these pages configure the component; placement is handled in the Wix site editor. Do not claim to edit or publish the site for the user.`,
    activated: true,
    tags: ['site components', 'member tickets', 'chat settings', 'widget design', 'site editor'],
    examples: [
      'Where do I customize the member ticket area?',
      'How do I change the chat widget colors?',
      'Where do I set chat routing?',
      'How do I add the ticket component to my site?',
    ],
  },
  {
    slug: 'get-my-tickets-support',
    displayName: 'Get My Tickets support',
    description:
      'Guides users to My Tickets help and support, login and account controls, notifications and common access troubleshooting.',
    guidelines: `# Get My Tickets support

- To contact the My Tickets team, open Help & Support in the sidebar and submit the support request form.
- The notification bell is in the sidebar header. Use it to review and dismiss in-app notifications.
- The profile menu at the bottom of the sidebar contains agent status and sign-out controls.
- My Tickets AI is a separate assistant entry in the sidebar footer and appears only when enabled for the user.
- If an agent cannot sign in or the dashboard does not load, use the app's sign-in and password-help flows. For account access or permissions, contact the site administrator; for app issues, use Help & Support.
- If the dashboard asks for onboarding or a plan, follow the displayed prompts or contact an administrator. Do not promise that a feature is included in a plan unless the app shows that information.

Give the user the screen name and the next action. Do not claim to submit a support request, change agent status, sign in or sign out for them.`,
    activated: true,
    tags: ['support', 'help', 'notifications', 'login', 'account'],
    examples: [
      'How do I contact My Tickets support?',
      'Where are my notifications?',
      'How do I sign out?',
      'I can’t access the dashboard. What should I check?',
      'Where can I get password help?',
    ],
  },
];

export default extensions.genericExtension({
  compId: '0ed98f5e-3b44-4d2c-9cbb-2547b3d6a4e1',
  compName: 'My Tickets App Skills',
  compType: 'APP_SKILLS',
  compData: { appSkills: { skills } },
});
