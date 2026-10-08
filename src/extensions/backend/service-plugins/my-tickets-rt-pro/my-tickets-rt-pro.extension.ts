import { extensions } from '@wix/astro/builders'

export default extensions.realtimePermissionsProvider({
  id: '125dfbdd-5c13-4e97-ac00-1f433c84db8c',
  name: 'my-tickets-rt-pro',
  source: './extensions/backend/service-plugins/my-tickets-rt-pro/my-tickets-rt-pro.ts',
  providerName: 'my-tickets-rt-pro',
});
