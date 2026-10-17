import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Button, Card, SkeletonRectangle, Text } from '@wix/design-system';
import {
    CollectionEmptyState,
    CollectionErrorState,
    CollectionNoResultsState,
    Table,
    useTableCollection,
    type OffsetQuery,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import { Checkmark, StatusComplete, Undo } from '@wix/wix-ui-icons-common/lazy';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

interface Submission {
    _id: string;
    values?: Record<string, unknown>;
    fields?: Array<{
        id: string;
        label: string;
        type?: string;
        options?: Array<{ value: string; label: string }>;
    }>;
    pageUrl?: string;
    isSeen?: boolean;
    seenAt?: string | null;
    isResolved?: boolean;
    resolvedAt?: string | null;
    _createdDate?: string;
}

interface Props {
    permissions: string[];
}

const displayValue = (value: unknown) => Array.isArray(value) ? value.join(', ') : String(value ?? '—');
const displayFieldValue = (value: unknown, field: NonNullable<Submission['fields']>[number]) => {
    if (field.type === 'checkbox') return value ? 'Yes' : 'No';
    if (field.type === 'select') {
        const displayOption = (optionValue: unknown) => field.options?.find((option) => option.value === String(optionValue))?.label ?? String(optionValue ?? '—');
        return Array.isArray(value) ? value.map(displayOption).join(', ') : displayOption(value);
    }
    return displayValue(value);
};

const OfflineFormSubmissions = ({ permissions }: Props) => {
    const canView = permissions.includes('my-tickets-view-offline-form-submissions');
    const canManage = permissions.includes('my-tickets-manage-offline-form-submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [tableRefreshKey, setTableRefreshKey] = useState(0);

    const loadSubmissions = useCallback(async () => {
        if (!canView) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setIsError(false);
        try {
            const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/offline-form-submissions/get`);
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load submissions');
            setSubmissions(Array.isArray(result.submissions) ? result.submissions : []);
            setTableRefreshKey((key) => key + 1);
        } catch (error) {
            console.error('Failed to load offline form submissions', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [canView]);

    useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

    const tableState = useTableCollection<Submission>({
        queryName: `my-tickets.offline-form-submissions.${tableRefreshKey}`,
        paginationMode: 'offset',
        queryOptions: { staleTime: 0 },
        itemKey: (submission) => submission._id,
        itemName: (submission) => submission._id,
        filters: {},
        fetchData: async ({ limit, offset }: OffsetQuery) => ({
            items: submissions.slice(offset, offset + limit),
            total: submissions.length,
        }),
    });

    const updateStatus = async (submissionId: string, status: 'seen' | 'resolved') => {
        try {
            const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/offline-form-submissions/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId, status }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to update submission');
            const updateKey = status === 'seen' ? 'isSeen' : 'isResolved';
            const nextValue = Boolean(result[updateKey]);
            const timestampKey = status === 'seen' ? 'seenAt' : 'resolvedAt';
            setSubmissions((current) => current.map((submission) => submission._id === submissionId
                ? { ...submission, [updateKey]: nextValue, [timestampKey]: nextValue ? new Date().toISOString() : null }
                : submission));
            setTableRefreshKey((key) => key + 1);
        } catch (error) {
            console.error('Failed to update offline form submission', error);
            setIsError(true);
        }
    };

    if (!canView) return <PermissionDeniedState />;

    // Use saved form field metadata rather than assuming a fixed name/email/message form.
    // A field id maps to one table column across submissions, including older form versions.
    const dynamicFieldMap = new Map<string, NonNullable<Submission['fields']>[number]>();
    submissions.forEach((submission) => {
        (submission.fields || []).forEach((field) => {
            if (field.id && !dynamicFieldMap.has(field.id)) dynamicFieldMap.set(field.id, field);
        });
        Object.keys(submission.values || {}).forEach((id) => {
            if (!dynamicFieldMap.has(id)) dynamicFieldMap.set(id, { id, label: id });
        });
    });
    const dynamicFields = Array.from(dynamicFieldMap.values());

    const columns = [
        ...dynamicFields.map((field) => ({
            id: field.id,
            title: field.label || field.id,
            width: '180px',
            render: (row: Submission) => {
                const rowField = row.fields?.find((submissionField) => submissionField.id === field.id) || field;
                return <Text>{displayFieldValue(row.values?.[field.id], rowField)}</Text>;
            },
        })),
        {
            id: 'siteUrl',
            title: 'Site URL',
            width: '220px',
            render: (row: Submission) => row.pageUrl
                ? <Text size="small" ellipsis maxWidth={220} style={{ display: 'block', width: '220px', maxWidth: '220px' }}>{row.pageUrl}</Text>
                : <Text secondary>—</Text>,
        },
        {
            id: 'seen',
            title: 'Seen',
            width: '100px',
            render: (row: Submission) => <Badge skin={row.isSeen ? 'standard' : 'warning'}>{row.isSeen ? 'Seen' : 'New'}</Badge>,
        },
        {
            id: 'resolution',
            title: 'Resolution',
            width: '120px',
            render: (row: Submission) => <Badge skin={row.isResolved ? 'success' : 'standard'}>{row.isResolved ? 'Resolved' : 'Open'}</Badge>,
        },
    ];

    return (
        <CollectionPage height="100%">
            <CollectionPage.Header
                title={{ text: 'Offline Form Submissions', hideTotal: true }}
                subtitle={{ text: 'Messages visitors sent while chat was offline.' }}
            />
            <CollectionPage.Content>
                <Box direction="vertical" gap="SP4">
                    {isError && <Card><Card.Content><Box verticalAlign="middle" gap="SP3"><Text>Submissions couldn’t be loaded or updated.</Text><Button size="small" priority="secondary" onClick={() => void loadSubmissions()}>Try again</Button></Box></Card.Content></Card>}

                        <Table
                            state={tableState}
                            columns={columns}
                            search={false}
                            emptyState={
                                <CollectionEmptyState
                                    title="No offline submissions yet"
                                    subtitle="New messages sent through the offline chat form will appear here."
                                />
                            }
                            noResultsState={
                                <CollectionNoResultsState
                                    title="No submissions found"
                                    subtitle="No submissions match your current filters."
                                />
                            }
                            errorState={(error, { retry }) => (
                                <CollectionErrorState
                                    title="Failed to load submissions"
                                    subtitle={String(error)}
                                    action={{ text: 'Retry', onClick: retry }}
                                />
                            )}
                            actionCell={canManage
                                ? (row) => ({
                                    secondaryActions: [
                                        { text: row.isSeen ? 'Mark as new' : 'Mark as seen', icon: row.isSeen ? <Undo /> : <Checkmark />, onClick: () => void updateStatus(row._id, 'seen') },
                                        { text: row.isResolved ? 'Reopen' : 'Mark resolved', icon: row.isResolved ? <Undo /> : <StatusComplete />, onClick: () => void updateStatus(row._id, 'resolved') },
                                    ],
                                })
                                : undefined}
                        />
           
                </Box>
            </CollectionPage.Content>
        </CollectionPage>
    );
};

export default OfflineFormSubmissions;
