import type { DataCollection } from '@wix/astro/builders'
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const collectionIdSuffix = 'agents';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Agents',
  displayField: 'name',
  fields: [
    {
      "key": "userId",
      "displayName": "User ID",
      "type": "TEXT",
      "description": "Identifier of the user",
    },
    {
      "key": "email",
      "displayName": "Email",
      "type": "TEXT",
      "description": "Email address of the user",
    },
    {
      "key": "name",
      "displayName": "Name",
      "type": "TEXT",
      "description": "Name of the user"
    },
    {
      "key": "phoneNumber",
      "displayName": "Phone Number",
      "type": "TEXT",
      "description": "Contact phone number of the user"
    },
    {
      "key": "role",
      "displayName": "Role",
      "type": "REFERENCE",
      "description": "Role of the user (e.g., customer, support agent, admin)",
      "referenceOptions": {
        "referencedCollectionId": CollectionIds.ROLES,
      }
    },
    {
      "key": "team",
      "displayName": "Team",
      "type": "REFERENCE",
      "description": "Identifier of the team the user belongs to",
      "referenceOptions": {
        "referencedCollectionId": CollectionIds.TEAMS,
      }
    },
    {
      "key": "profilePictureUrl",
      "displayName": "Profile Picture",
      "type": "TEXT",
      "description": "URL of the user's profile picture",
    },
    {
      "key": "assignedTickets",
      "displayName": "Assigned Tickets",
      "type": "ARRAY",
      "description": "List of tickets assigned to the user",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "notifications",
      "displayName": "Notifications",
      "type": "ARRAY",
      "description": "List of notifications for the user",
      "arrayOptions": {
        "elementType": "ANY"
      }
    }
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
