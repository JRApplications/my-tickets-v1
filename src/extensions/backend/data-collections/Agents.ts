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
    },
    {
      "key": "resetChallengeId",
      "displayName": "Password Reset Challenge ID",
      "type": "TEXT",
      "description": "Private, short-lived identifier for an active password reset challenge",
    },
    {
      "key": "resetCodeHash",
      "displayName": "Password Reset Code Hash",
      "type": "TEXT",
      "description": "Private server-side HMAC of the active password reset code",
    },
    {
      "key": "resetExpiresAt",
      "displayName": "Password Reset Expiry",
      "type": "NUMBER",
      "description": "Private expiration time for the active password reset challenge",
    },
    {
      "key": "resetAttempts",
      "displayName": "Password Reset Attempts",
      "type": "NUMBER",
      "description": "Private failed verification attempts for the active reset challenge",
    },
    {
      "key": "resetRequestedAt",
      "displayName": "Password Reset Requested At",
      "type": "NUMBER",
      "description": "Private timestamp used to limit password reset email frequency",
    },
    {
      "key": "loginFailedAttempts",
      "displayName": "Login Failed Attempts",
      "type": "NUMBER",
      "description": "Private failed login count for the current time window",
    },
    {
      "key": "loginFailureWindow",
      "displayName": "Login Failure Window",
      "type": "NUMBER",
      "description": "Private time window identifier for login throttling",
    },
    {
      "key": "loginLockedUntil",
      "displayName": "Login Locked Until",
      "type": "NUMBER",
      "description": "Private time after which login attempts are allowed again",
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
