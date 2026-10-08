import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'roles';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Roles',
  displayField: "roleName",
  fields: [
    {
      "key": "roleName",
      "displayName": "Role Name",
      "type": "TEXT",
      "description": "Name of the agent role",
    },
    {
      "key": "roleDescription",
      "displayName": "Role Description",
      "type": "TEXT",
      "description": "Description of the agent role",
    },
    {
      "key": "permissions",
      "displayName": "Permissions",
      "type": "ARRAY",
      "description": "List of permissions associated with the role",
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
