import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'chatWidgetConfig';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Chat Widget Config',
  fields: [
    {
      "key": "chatQuestions",
      "displayName": "Chat Questions",
      "type": "ARRAY",
      "description": "List of chat questions for the widget",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "enableChatQuestions",
      "displayName": "Enable Chat Questions",
      "type": "BOOLEAN",
      "description": "Indicates if chat questions are enabled for the widget",
    },
    {
      "key": "useAiDirect",
      "displayName": "Use AI Direct",
      "type": "BOOLEAN",
      "description": "Indicates if AI Direct routing is enabled for the widget",
    },
    {
      "key": "availableTeams",
      "displayName": "Available Teams",
      "type": "ARRAY",
      "description": "List of teams available for AI Direct routing",
      "arrayOptions": {
        "elementType": "ANY"
      },
    },
    {
      "key": "generalTeamId",
      "displayName": "General Team ID",
      "type": "TEXT",
      "description": "Identifier of the general team for AI Direct routing fallback or default chat team",
    },
    {
      "key": "businessSupportHours",
      "displayName": "Business Support Hours",
      "type": "ARRAY",
      "description": "List of business support hours for the widget",
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
