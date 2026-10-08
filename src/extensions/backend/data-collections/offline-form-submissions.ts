import type { DataCollection } from '@wix/astro/builders'

export const collectionIdSuffix = 'offlineFormSubmissions';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Offline Form Submissions',
  fields: [
    { type: 'TEXT', displayName: 'Form Title', key: 'formTitle' },
    { type: 'OBJECT', displayName: 'Submitted Values', key: 'values', objectOptions: { fields: [] } },
    { type: 'ARRAY', displayName: 'Form Fields', key: 'fields', arrayOptions: { elementType: 'ANY' } },
    { type: 'TEXT', displayName: 'Page URL', key: 'pageUrl' },
    { type: 'BOOLEAN', displayName: 'Seen', key: 'isSeen' },
    { type: 'DATETIME', displayName: 'Seen At', key: 'seenAt' },
    { type: 'BOOLEAN', displayName: 'Resolved', key: 'isResolved' },
    { type: 'DATETIME', displayName: 'Resolved At', key: 'resolvedAt' },
  ],
  displayField: 'formTitle',
  dataPermissions: {
    itemInsert: 'PRIVILEGED',
    itemRead: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
