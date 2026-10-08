import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'chatConversations';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Chat Conversations',
  displayField: 'channel',
  fields: [
    {
      "key": "metaData",
      "displayName": "Meta Data",
      "type": "OBJECT",
      "description": "List of meta data for the chat conversation",
      "objectOptions": {
        "fields": []
      },
    },
    {
      "key": "messages",
      "displayName": "Messages",
      "type": "ARRAY",
      "description": "List of messages in the chat conversation",
      "arrayOptions": {
        "elementType": "ANY"
      },
    },
    {
      "key": "channel",
      "displayName": "Channel",
      "type": "TEXT",
      "description": "Channel ID"
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
