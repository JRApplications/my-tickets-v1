import{ extensions } from '@wix/astro/builders';

export default extensions.customElement({
  id: '2d9049f6-5299-4694-a95f-3ed475879af1',
  name: 'Member Tickets ',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: true
  },
  presets: [
    {
      id: '86fdcdc7-b893-47bf-ad18-f3186d1aa57a',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/member-tickets-thumbnail.png',
    },
  ],
  
  tagName: 'member-tickets',
  element: './extensions/site/widgets/member-tickets/member-tickets.tsx',
  settings: './extensions/site/widgets/member-tickets/member-tickets.panel.tsx',
});
