import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Button, Card, Page, SkeletonRectangle, Table, TableActionCell, Text } from '@wix/design-system';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import { Checkmark, StatusComplete, Undo } from '@wix/wix-ui-icons-common/odeditor';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import './offline-form-submissions.css';

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
        } catch (error) {
            console.error('Failed to load offline form submissions', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [canView]);

    useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

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
            title: field.label || field.id,
            width: '180px',
            render: (row: Submission) => {
                const rowField = row.fields?.find((submissionField) => submissionField.id === field.id) || field;
                return <Text>{displayFieldValue(row.values?.[field.id], rowField)}</Text>;
            },
        })),
        {
            title: 'Site URL',
            width: '220px',
            render: (row: Submission) => row.pageUrl
                ? <Text size="small" ellipsis maxWidth={220} style={{ display: 'block', width: '220px', maxWidth: '220px' }}>{row.pageUrl}</Text>
                : <Text secondary>—</Text>,
        },
        {
            title: 'Seen',
            width: '100px',
            render: (row: Submission) => <Badge skin={row.isSeen ? 'standard' : 'warning'}>{row.isSeen ? 'Seen' : 'New'}</Badge>,
        },
        {
            title: 'Resolution',
            width: '120px',
            render: (row: Submission) => <Badge skin={row.isResolved ? 'success' : 'standard'}>{row.isResolved ? 'Resolved' : 'Open'}</Badge>,
        },
        {
            title: '',
            width: '100px',
            render: (row: Submission) => canManage ? <TableActionCell
                moreActionsTooltipText="Submission actions"
                secondaryActions={[
                    { text: row.isSeen ? 'Mark as new' : 'Mark as seen', icon: row.isSeen ? <Undo /> : <Checkmark />, onClick: () => void updateStatus(row._id, 'seen') },
                    { text: row.isResolved ? 'Reopen' : 'Mark resolved', icon: row.isResolved ? <Undo /> : <StatusComplete />, onClick: () => void updateStatus(row._id, 'resolved') },
                ]}
            /> : null,
        },
    ];

    return (
        <Page maxWidth={9999} className="offline-form-submissions-page">
            <Page.Header title="Offline Form Submissions" subtitle="Messages visitors sent while chat was offline." />
            <Page.Content>
                <Box direction="vertical" gap="SP4">
                    {isError && <Card><Card.Content><Box verticalAlign="middle" gap="SP3"><Text>Submissions couldn’t be loaded or updated.</Text><Button size="small" priority="secondary" onClick={() => void loadSubmissions()}>Try again</Button></Box></Card.Content></Card>}
                    {isLoading ? <Card><Card.Content><Box direction="vertical" gap="SP3"><SkeletonRectangle height="44px" /><SkeletonRectangle height="60px" /><SkeletonRectangle height="60px" /></Box></Card.Content></Card> : (
                        <Card>
                            <Table
                                data={submissions}
                                columns={columns}
                                showHeaderWhenEmpty
                                rowVerticalPadding="medium"
                            >
                                {submissions.length ? <Table.Content /> : <Table.EmptyState
                                    skin="page-no-border"
                                    title="No offline submissions yet"
                                    subtitle="New messages sent through the offline chat form will appear here."
                                />}
                            </Table>
                        </Card>
                    )}
                </Box>
            </Page.Content>
        </Page>
    );
};

export default OfflineFormSubmissions;
