import { extensions } from '@wix/custom-extensions'

export default extensions.dashboardPage({
  id: '15c388ce-8dca-4650-8d26-1363a60879cb',
  title: 'My Tickets',
  routePath: 'my-tickets',
  component: './extensions/dashboard/pages/my-tickets/my-tickets.tsx',
  fullPage: true,
  metaData: {
    searchable: true,
    description: 'My Tickets  - View and manage your tickets',
  },
  priority: 0,
  
});
