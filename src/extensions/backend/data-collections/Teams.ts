import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'teams';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Teams',
  displayField: 'name',
  fields: [
    {
      "key": "name",
      "displayName": "Team Name",
      "type": "TEXT",
      "description": "Name of the support team",
    },
    {
      "key": "description",
      "displayName": "Team Description",
      "type": "TEXT",
      "description": "Detailed description of the team"
    },
    {
      "key": "email",
      "displayName": "Team Email",
      "type": "TEXT",
      "description": "Email address for the team"
    },
    {
      "key": "teamPictureUrl",
      "displayName": "Team Picture URL",
      "type": "TEXT",
      "description": "URL of the team's picture",
    },
    {
      "key": "assignedTickets",
      "displayName": "Assigned Tickets",
      "type": "ARRAY",
      "description": "List of tickets assigned to the team",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
  ],
  dataPermissions: {
    "itemRead": "PRIVILEGED",
    "itemInsert": "PRIVILEGED",
    "itemUpdate": "PRIVILEGED",
    "itemRemove": "PRIVILEGED",
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
