import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'tickets';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Tickets',
  displayField: 'primaryTicketNumber',
  fields: [
    {
      "key": "primaryTicketNumber",
      "displayName": "Ticket Number",
      "type": "TEXT",
      "description": "Unique identifier for the ticket",
    },
    {
      "key": "subject",
      "displayName": "Subject",
      "type": "TEXT",
      "description": "Ticket subject",
    },
    {
      "key": "status",
      "displayName": "Status",
      "type": "TEXT",
      "description": "Current status (e.g., open, in-progress, resolved, closed)",
    },
    {
      "key": "priority",
      "displayName": "Priority",
      "type": "TEXT",
      "description": "Priority level (e.g., low, medium, high, critical)",
    },
    {
      "key": "assignedAgent",
      "displayName": "Assigned Agent",
      "type": "OBJECT",
      "description": "Identifier of the person assigned to this ticket",
      "objectOptions": {
        fields: []
      }
    },
    {
      "key": "agentsFollowing",
      "displayName": "Agents Following",
      "type": "ARRAY",
      "description": "Identifiers of agents following this ticket",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "internalNotes",
      "displayName": "Internal Notes",
      "type": "ARRAY",
      "description": "Notes visible only to support staff",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "timeline",
      "displayName": "Timeline",
      "type": "ARRAY",
      "description": "Timeline of events related to the ticket",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "memberId",
      "displayName": "Member ID",
      "type": "TEXT",
      "description": "Identifier of the member who created the ticket"
    },
    {
      "key": "memberName",
      "displayName": "Member Name",
      "type": "TEXT",
      "description": "Name of the member who created the ticket",
    },
    {
      "key": "communication",
      "displayName": "Communication",
      "type": "ARRAY",
      "description": "Communication logs related to the ticket",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "teamsFollowing",
      "displayName": "Teams Following",
      "type": "ARRAY",
      "description": "Identifiers of the teams following the ticket",
      "arrayOptions": {
        "elementType": "ANY"
      }
    },
    {
      "key": "assignedTeam",
      "displayName": "Assigned Team",
      "type": "OBJECT",
      "description": "Identifier of the team assigned to the ticket",
      "objectOptions": {
        "fields": []
      }
    },
    {
      "key": "mergeSummary",
      "displayName": "Merge Summary",
      "type": "OBJECT",
      "description": "Summary of the merged tickets",
      "objectOptions": {
        fields: []
      }
    },
    {
      "key": "tags",
      "displayName": "Tags",
      "type": "ARRAY_STRING",
      "description": "Tags associated with the ticket"
    },
    {
      "key": "relatedTickets",
      "displayName": "Related Tickets",
      "type": "ARRAY_STRING",
      "description": "Related tickets associated with the ticket"
    },
    {
      "key": "sla",
      "displayName": "SLA",
      "type": "OBJECT",
      "description": "SLA clocks (first response, next response, and resolution) for the ticket",
      "objectOptions": {
        fields: []
      }
    },
    {
      "key": "slaNextCheckAt",
      "displayName": "SLA Next Check At",
      "type": "NUMBER",
      "description": "Epoch ms of the next SLA at-risk or breach check"
    }
  ],
  "indexes": [
    {
      fields: [
        { path: 'assignedAgent.id' },
        { path: 'status' },
        { path: '_createdDate', order: 'DESC' },
      ],
    },
    { fields: [{ path: 'slaNextCheckAt' }] },
    {
      fields: [{ path: 'primaryTicketNumber' }],
      unique: true,
    },
  ],

  dataPermissions: {
    "itemRead": "PRIVILEGED",
    "itemInsert": "PRIVILEGED",
    "itemUpdate": "PRIVILEGED",
    "itemRemove": "PRIVILEGED",
  },
  initialData: []
} satisfies DataCollection;
