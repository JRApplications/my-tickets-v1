import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'slaSettings';

export default {
  idSuffix: collectionIdSuffix, // The suffix used to uniquely identify this collection within the Wix Data interface or api. For example '@johnNamespace/john-doe-app/slaSettings'.
  displayName: 'SLA Settings', // The name of the collection as it will appear in the Wix Data interface.
  displayField: 'enabled', // The first field the user will see in the collection. This is a 'priority' field for display purposes.
  fields: [
    {
      "key": "enabled",
      "displayName": "Enabled",
      "type": "BOOLEAN",
      "description": "Whether SLA tracking is enabled",
    },
    {
      "key": "timezone",
      "displayName": "Timezone",
      "type": "TEXT",
      "description": "IANA timezone used for business hours",
    },
    {
      "key": "alwaysOn",
      "displayName": "Always On",
      "type": "BOOLEAN",
      "description": "Count SLA time 24/7 instead of business hours only",
    },
    {
      "key": "businessHours",
      "displayName": "Business Hours",
      "type": "ARRAY",
      "description": "Weekly business hours used by SLA clocks",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "policies",
      "displayName": "Policies",
      "type": "OBJECT",
      "description": "First-response, next-response, and resolution targets per priority",
      "objectOptions": {
        "fields": []
      }
    },
    {
      "key": "teamOverrides",
      "displayName": "Team Overrides",
      "type": "ARRAY",
      "description": "Per-team overrides of the policy targets",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "atRiskThresholdPct",
      "displayName": "At Risk Threshold (%)",
      "type": "NUMBER",
      "description": "Percent of the target after which a ticket is at risk",
    },
    {
      "key": "escalateOnBreach",
      "displayName": "Escalate On Breach",
      "type": "BOOLEAN",
      "description": "Raise ticket priority when an SLA is breached",
    },
    {
      "key": "showCustomerEta",
      "displayName": "Show Customer ETA",
      "type": "BOOLEAN",
      "description": "Show the expected first response time to customers",
    },
    {
      "key": "escalationRules",
      "displayName": "Escalation Rules",
      "type": "ARRAY",
      "description": "Optional priority rules applied when an SLA is breached",
      "arrayOptions": { "elementType": "ANY" }
    }
  ],
  dataPermissions: {
    "itemRead": "PRIVILEGED", // Only privileged users can read items from this collection.
    "itemInsert": "PRIVILEGED", // Only privileged users can insert new items into this collection.
    "itemUpdate": "PRIVILEGED", // Only privileged users can update items in this collection.
    "itemRemove": "PRIVILEGED", // Only privileged users can remove items from this collection.
  },
  indexes: [], // Indexes for optimizing queries on this collection.
  initialData: [], // Initial data to populate the collection with.
} satisfies DataCollection;
