import { extensions } from '@wix/astro/builders'
import ticketsCollection from './Tickets';
import teamsCollection from './Teams';
import agentsCollection from './Agents';
import chatWidgetConfigCollection from './Chat-Widget-Config';
import chatConversationsCollection from './Chat-Conversations';
import slaSettingsCollection from './SLA-Settings';
import rolesCollection from './Roles';
import offlineFormSubmissionsCollection from './offline-form-submissions';

export default extensions.dataCollections({
  id: 'f744c678-9cac-4310-a193-b978040139cf',
  name: 'Data Collections',
  collections: [
    ticketsCollection,
    teamsCollection,
    agentsCollection,
    chatWidgetConfigCollection,
    chatConversationsCollection,
    slaSettingsCollection,
    rolesCollection,
    offlineFormSubmissionsCollection,
  ],
});
