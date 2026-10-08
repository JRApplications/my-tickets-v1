import {
    CustomModalLayout,
    Modal,
    Stepper,
    Card,
    Box,
    Avatar,
    CardGalleryItem,
    Input,
    Text,
    Dropdown,
    FormField,
    Divider,
    Button,
    InputArea,
    EmptyState,
    Loader,
    MultiSelect,
    Tooltip,
    TextButton,
    InfoIcon,
    TableToolbar,
    TagList,
    Table,
    TableActionCell,
    SkeletonLine,
    SkeletonRectangle,
    SkeletonCircle
} from '@wix/design-system';
import { SparklesFilled as SparklesIcon, ViewExternal as EyeIcon } from '@wix/wix-ui-icons-common/odeditor'
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { 
    STATUS_OPTIONS, 
    PRIORITY_OPTIONS, 
    type TicketPriority, 
    type TicketStatus,
    type CreateTicketPayload 
} from '@jrapps/my_tickets_common_types';
import { teams, createTicket, getRelatedTickets, openRelatedTicket } from './useTicketModal';
import { useEffect } from 'react';
import { useCreateTicketAI } from './useCreateTicketAI';

import { useState } from 'react';

import {
    Phone as PhoneIcon,
    Location as LocationIcon,
} from '@wix/wix-ui-icons-common/odeditor';

import './CreateTicketModal.css';

const ComponentsSize = 'medium';

const getOptionValue = (
    options: { id: string; value: string }[],
    id?: string
) => options.find((option) => option.id === id)?.value;

const SummaryRow = ({
    label,
    value,
}: {
    label: string;
    value?: string;
}) => (
    <Box direction="horizontal" gap={2} width="100%">
        <Box minWidth="160px">
            <Text size="small" secondary>
                {label}
            </Text>
        </Box>

        <Text size="small">{value || '\u2014'}</Text>
    </Box>
);

type MemberSearchResult = {
    _id: string;
    name?: string;
    email?: string;
};

const MemberSearchResultItem = ({
    member,
    onSelect,
}: {
    member: MemberSearchResult;
    onSelect: (member: MemberSearchResult) => void;
}) => {
    return (
        <CardGalleryItem
            skin="outlined"
            backgroundImageNode={<Avatar size="size30" />}

            primaryActionProps={{}}
            title={
                <Text weight="bold" size="small">
                    {member.name || 'Unnamed member'}
                </Text>
            }
            subtitle={
                <Text size="tiny">
                    {member.email || 'No email address'}
                </Text>
            }
            size="small"
            imagePlacement="side"
            suffix={
                <Button
                    priority="secondary"
                    size="tiny"
                    onClick={() => onSelect(member)}
                >
                    Select
                </Button>
            }
            dataHook="member-search-result-item"
        />
    );
};

const SelectMemberState = ({
    searchInput,
    setSearchInput,
    searchMemberResults,
    hasSearched,
    selectedMember,
    handleMemberSelect,
    handleSearch,
    addresses,
    setAddresses,
    isSearching,
    showMemberError,
}: {
    searchInput: string;
    setSearchInput: (value: string) => void;
    searchMemberResults: MemberSearchResult[];
    hasSearched: boolean;
    selectedMember: any;
    handleMemberSelect: (member: MemberSearchResult) => void;
    handleSearch: () => void;
    addresses: any[];
    setAddresses: (addresses: any[]) => void;
    isSearching: boolean;
    showMemberError: boolean;
}) => {
    return (
        <Box
            direction="horizontal"
            gap="12px"
            width="100%"
            height="100%"
            minHeight={0}
            padding="12px"
            boxSizing="border-box"
        >
            {/* LEFT CARD */}
            <Card
                dataHook="create-ticket-card"
                stretchVertically
                hideOverflow
            >
                <Card.Header title="Search for a Member" />

                <Card.Content>

                    <Box
                        direction="vertical"
                        gap={4}
                        height="100%"
                        minHeight={0}
                    >
                        {/* Search */}
                        <FormField
                            label="Member"
                            status={showMemberError ? 'error' : undefined}
                            statusMessage={showMemberError ? 'Search for and select a member before continuing.' : undefined}
                        >
                            <Box direction="horizontal" gap={3} width="100%">
                                <Input
                                    placeholder="Enter member details..."
                                    size={ComponentsSize}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onEnterPressed={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    className="search-input"
                                />
                                <Button
                                    size={ComponentsSize}
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                >
                                    Search
                                </Button>
                            </Box>
                        </FormField>

                        {isSearching && (
                            <Box
                                direction="vertical"
                                gap={2}
                                flexGrow={1}
                                minHeight={0}
                            >
                                <Box
                                    display="flex"
                                    WebkitJustifyContent="space-between"
                                    width="100%"
                                    verticalAlign="middle"
                                >
                                    <Text>
                                        <SkeletonLine width="150px" />
                                    </Text>

                                    <Text size="small">
                                        <SkeletonLine width="100px" />
                                    </Text>
                                </Box>

                                <Box
                                    direction="vertical"
                                    gap={3}
                                    minHeight={0}
                                    boxSizing="border-box"
                                    padding={2}
                                    overflowY="auto"
                                >
                                    {[...Array(3)].map((_) => (
                                        <CardGalleryItem
                                            skin="outlined"
                                            backgroundImageNode={<SkeletonCircle diameter="30px" />}

                                            primaryActionProps={{}}
                                            title={
                                                <SkeletonLine width="100px" />
                                            }
                                            subtitle={
                                                <SkeletonLine width="100px" />
                                            }
                                            size="small"
                                            imagePlacement="side"
                                            suffix={
                                                <SkeletonRectangle width="50px" height="15px" />
                                            }
                                            // dataHook="member-search-result-item"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {!isSearching && searchMemberResults.length === 0 && (
                            <Box width='100%' height='100%' verticalAlign="middle">
                                <EmptyState
                                    title={hasSearched ? 'No members found' : 'Search for a member to get started'}
                                    subtitle={
                                        hasSearched
                                            ? 'Try a different name or email address.'
                                            : 'Enter a name or email address to find and select a member.'
                                    }
                                />
                            </Box>
                        )}
                        {/* Results */}
                        {!isSearching && searchMemberResults.length > 0 && (
                            <Box
                                direction="vertical"
                                gap={2}
                                flexGrow={1}
                                minHeight={0}
                            >
                                <Box
                                    display="flex"
                                    WebkitJustifyContent="space-between"
                                    width="100%"
                                    verticalAlign="middle"
                                >
                                    <Text>
                                        Member Results
                                    </Text>

                                    <Text size="small">
                                        {searchMemberResults.length} {searchMemberResults.length === 1 ? 'result' : 'results'} found
                                    </Text>
                                </Box>

                                {/* ACTUAL SCROLL CONTAINER */}
                                <Box
                                    direction="vertical"
                                    gap={3}
                                    flexGrow={1}
                                    minHeight={0}
                                    boxSizing="border-box"
                                    padding={2}
                                    overflowY="auto"
                                >
                                    {searchMemberResults.map(
                                        (member) => (
                                            <MemberSearchResultItem
                                                key={member._id}
                                                member={member}
                                                onSelect={handleMemberSelect}
                                            />
                                        )
                                    )}
                                </Box>

                            </Box>
                        )}

                    </Box>


                </Card.Content>
            </Card>

            {/* RIGHT CARD */}
            <Card
                dataHook="create-ticket-card"
                stretchVertically
                hideOverflow
            >
                <Card.Header title="Selected Member" />

                <Card.Content>
                    <Box
                        direction="vertical"
                        height="100%"
                        minHeight={0}
                    >

                        {/* ACTUAL SCROLL CONTAINER */}
                        {selectedMember && (
                            <Box
                                direction="vertical"
                                gap={2}
                                flexGrow={1}
                                minHeight={0}
                                boxSizing="border-box"
                                overflowY="auto"
                            >
                                {/* First / Last Name */}
                                <Box
                                    direction="horizontal"
                                    gap={2}
                                    width="100%"
                                >
                                    <Box
                                        flexGrow={1}
                                        minWidth={0}
                                    >
                                        <FormField label="First Name">
                                            <Input
                                                size={ComponentsSize}
                                                value={
                                                    selectedMember?.contact?.firstName || ''
                                                }
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>

                                    <Box
                                        flexGrow={1}
                                        minWidth={0}
                                    >
                                        <FormField label="Last Name">
                                            <Input
                                                value={
                                                    selectedMember?.contact?.lastName || ''
                                                }
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>
                                </Box>

                                {/* Email / Phones / Addresses */}
                                <Box
                                    direction="vertical"
                                    gap={2}
                                >
                                    <FormField label="Email">
                                        <Input
                                            size={ComponentsSize}
                                            value={
                                                selectedMember?.loginEmail ||
                                                selectedMember?.email ||
                                                ''
                                            }
                                            readOnly
                                        />
                                    </FormField>

                                    <FormField label="Phones">
                                        <Dropdown
                                            options={
                                                selectedMember?.contact?.phones?.map(
                                                    (phone: any) => ({
                                                        id: phone,
                                                        value: phone,
                                                    })
                                                ) || []
                                            }
                                            selectedId={
                                                selectedMember?.contact?.phones?.[0] ||
                                                ''
                                            }
                                            placeholder="No phones available"
                                            prefix={
                                                <Box verticalAlign="middle">
                                                    <PhoneIcon />
                                                </Box>
                                            }
                                            size={ComponentsSize}
                                        />
                                    </FormField>

                                    <FormField label="Addresses">
                                        <Dropdown
                                            options={
                                                selectedMember?.contact?.addresses?.map(
                                                    (ad: any) => ({
                                                        id: ad._id,
                                                        value: ad.addressLine,
                                                    })
                                                ) || []
                                            }
                                            selectedId={
                                                addresses[0]?._id || ''
                                            }
                                            onSelect={(option) => {
                                                const selectedAddress =
                                                    selectedMember?.contact?.addresses?.find(
                                                        (ad: any) =>
                                                            ad._id === option.id
                                                    );

                                                setAddresses(
                                                    selectedAddress
                                                        ? [selectedAddress]
                                                        : []
                                                );
                                            }}
                                            placeholder="No addresses available"
                                            size={ComponentsSize}
                                            prefix={
                                                <Box verticalAlign="middle">
                                                    <LocationIcon />
                                                </Box>
                                            }
                                        />
                                    </FormField>
                                </Box>

                                {/* Street */}
                                <Box
                                    direction="horizontal"
                                    gap={2}
                                    width="100%"
                                >
                                    <Box
                                        flexGrow={2}
                                        minWidth={0}
                                    >
                                        <FormField label="Street">
                                            <Input
                                                size={ComponentsSize}
                                                value={addresses[0]?.addressLine || ''}
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>

                                    <Box
                                        flexGrow={1}
                                        minWidth={0}
                                    >
                                        <FormField label="Street Line 2">
                                            <Input
                                                size={ComponentsSize}
                                                value={addresses[0]?.addressLine2 || ''}
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>
                                </Box>

                                {/* City / Zip */}
                                <Box
                                    direction="horizontal"
                                    gap={2}
                                    width="100%"
                                >
                                    <Box
                                        flexGrow={1}
                                        minWidth={0}
                                    >
                                        <FormField label="City">
                                            <Input
                                                size={ComponentsSize}
                                                value={addresses[0]?.city || ''}
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>

                                    <Box
                                        flexGrow={1}
                                        minWidth={0}
                                    >
                                        <FormField label="Zip / Postal Code">
                                            <Input
                                                size={ComponentsSize}
                                                value={addresses[0]?.postalCode || ''}
                                                readOnly
                                            />
                                        </FormField>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                        {!selectedMember && (
                            <Box width='100%' height='100%' verticalAlign="middle">
                                <EmptyState
                                    title="No Member Selected"
                                    subtitle="Search and select a member from the list to view their details."
                                />
                            </Box>
                        )}
                    </Box>
                </Card.Content>
            </Card>
        </Box >
    );
};

const TicketDetailsState = ({
    userBetaFeatures,
    ticketSubject,
    setTicketSubject,
    ticketDescription,
    setTicketDescription,
    tags,
    setTags,
    showValidationErrors,
}: {
    userBetaFeatures: string[];
    ticketSubject: string;
    setTicketSubject: (value: string) => void;
    ticketDescription: string;
    setTicketDescription: (value: string) => void;
    tags: string[] | undefined,
    setTags: (value: any) => void;
    showValidationErrors: boolean;
}) => {
    const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);

    const { generateTicketSubject, improveTicketDescription, generateTicketTags } = useCreateTicketAI();

    const renderTagsMultiSelect = ({ size }: { size: any; tagSize: any }) => {

        const handleOnSelect = (option: any) => {
            setTags([...(tags || []), option[0]]);
        }


        const handleOnRemoveTag = (tagId: any) => {
            setTags((tags || []).filter((currTag: any) => currTag !== tagId));
        };

        const tagObjects = (tags || []).map((tag: any) => ({
            id: tag,
            label: tag
        }));

        return (
            <MultiSelect
                size={size}
                tags={tagObjects}
                placeholder="Select tags"
                onManuallyInput={handleOnSelect}
                onRemoveTag={handleOnRemoveTag}
            />
        );
    };

    const handleAIGenerateTicketSubject = async () => {
        setIsGeneratingSubject(true);
        try {
            const subject = await generateTicketSubject(ticketDescription);
            if (subject) {
                setTicketSubject(subject);
            }
        } catch (error) {
            console.error("Error generating ticket subject:", error);
        } finally {
            setIsGeneratingSubject(false);
        }
    };

    const handleAIImproveTicketDescription = async () => {
        setIsImprovingDescription(true);
        try {
            const improvedDescription = await improveTicketDescription(ticketDescription);
            if (improvedDescription) {
                setTicketDescription(improvedDescription);
            }
        } catch (error) {
            console.error("Error improving ticket description:", error);
        } finally {
            setIsImprovingDescription(false);
        }
    };

    const handleAIGenerateTicketTags = async () => {
        try {
            setIsGeneratingTags(true);
            const tags = await generateTicketTags(ticketSubject, ticketDescription);
            if (tags) {
                setTags(tags);
                setIsGeneratingTags(false);
            }
        } catch (error) {
            setIsGeneratingTags(false);
            console.error("Error generating ticket tags:", error);
        }
    };

    return (
        <Box
            width="100%"
            height="100%"
            minHeight={0}
        >
            <Card
                dataHook="create-ticket-card"
            >
                <Card.Header title="Ticket Details" />
                <Card.Content>
                    <Box
                        direction="vertical"
                        width="100%"
                        height="100%"
                        minHeight={0}
                        gap={3}
                    >
                        <FormField
                            label="Ticket Subject"
                            required
                            status={showValidationErrors && !ticketSubject.trim() ? 'error' : undefined}
                            statusMessage={showValidationErrors && !ticketSubject.trim() ? 'Enter a ticket subject.' : undefined}
                            suffix={userBetaFeatures.includes('create_ticket_subject_ai') && (
                                <Tooltip appendTo="window" size='medium' content={`Generate the ticket subject using AI based on the description.${ticketDescription.trim() === "" ? " To enable this, enter a description first." : ""}`}>
                                    <TextButton onClick={handleAIGenerateTicketSubject} disabled={ticketDescription.trim() === ""} prefixIcon={<SparklesIcon />}>
                                        {isGeneratingSubject ? <Loader size="tiny" /> : "Generate with AI"}
                                    </TextButton>
                                </Tooltip>
                            )}
                        >
                            <Input
                                size={ComponentsSize}
                                value={ticketSubject}
                                onChange={(e) =>
                                    setTicketSubject(e.target.value)
                                }
                            />
                        </FormField>

                        <Box
                            direction="vertical"
                            flexGrow={1}
                            minHeight={0}
                            paddingBottom={7}
                        >
                            <FormField
                                label="Ticket Description"
                                required
                                status={showValidationErrors && !ticketDescription.trim() ? 'error' : undefined}
                                statusMessage={showValidationErrors && !ticketDescription.trim() ? 'Enter a ticket description.' : undefined}
                                classNames="full-height-field"
                                suffix={userBetaFeatures.includes('create_ticket_description_ai') && (
                                    <Tooltip appendTo="window" size='medium' content={"Improve the ticket description based on the current content."}>
                                        <TextButton onClick={handleAIImproveTicketDescription} disabled={ticketDescription.trim() === ""} prefixIcon={<SparklesIcon />}>
                                            {isImprovingDescription ? <Loader size="tiny" /> : "Improve description"}
                                        </TextButton>
                                    </Tooltip>
                                )}
                            >
                                <InputArea
                                    className="full-height-input"
                                    value={ticketDescription}
                                    onChange={(e) =>
                                        setTicketDescription(
                                            e.target.value
                                        )
                                    }
                                />
                            </FormField>
                        </Box>

                        <Box>
                            <FormField
                                label="Ticket Tags"
                                required
                                status={showValidationErrors && !tags?.length ? 'error' : undefined}
                                statusMessage={showValidationErrors && !tags?.length ? 'Add at least one tag.' : undefined}
                                infoContent="Enter tags for the ticket. Tags help to find relevant / similar tickets."
                                infoTooltipProps={{ size: 'medium' }}
                                suffix={userBetaFeatures.includes('create_ticket_generate_tags_ai') && (
                                    <Tooltip appendTo="window" size='medium' content={"Generate tags based on the ticket description and subject."}>
                                        <TextButton onClick={handleAIGenerateTicketTags} disabled={ticketDescription.trim() === "" || isGeneratingTags} prefixIcon={<SparklesIcon />}>
                                            {isGeneratingTags ? <Loader size="tiny" /> : "Generate tags with AI"}
                                        </TextButton>
                                    </Tooltip>
                                )}
                            >
                                {renderTagsMultiSelect({ size: 'medium', tagSize: 'small' })}
                            </FormField>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
};

interface RelatedTicket {
    _id: string;
    primaryTicketNumber: string;
    subject: string;
    _UpdatedDate: string;
    tags: string[];
}

const RelatedTicketsState = ({
    tags,
    setTags,
    relatedTickets,
    isLoading,
    isError,
    onSelectionChange,
    onSearch,
}: {
    tags?: string[];
    setTags: (tags: string[]) => void;
    relatedTickets: RelatedTicket[];
    isLoading: boolean;
    isError: boolean;
    onSelectionChange: (chosen: RelatedTicket[]) => void;
    onSearch: () => void;
}) => {

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Default to all found related tickets being selected/included whenever
    // a new search comes back, matching the previous (unconditional) behavior.
    useEffect(() => {
        const allIds = relatedTickets.map((t) => t._id);
        setSelectedIds(allIds);
        onSelectionChange(relatedTickets);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relatedTickets]);

    const handleSelectionChanged = (newIds: string[]) => {
        setSelectedIds(newIds);
        onSelectionChange(relatedTickets.filter((t) => newIds.includes(t._id)));
    };

    const renderTagsMultiSelect = ({ size }: { size: any }) => {

        const handleOnSelect = (option: any) => {
            setTags([...(tags || []), option[0]]);
        };

        const handleOnRemoveTag = (tagId: any) => {
            setTags((tags || []).filter((currTag: any) => currTag !== tagId));
        };

        const tagObjects = (tags || []).map((tag: any) => ({
            id: tag,
            label: tag,
        }));

        return (
            <MultiSelect
                size={size}
                tags={tagObjects}
                placeholder="Select tags"
                onManuallyInput={handleOnSelect}
                onRemoveTag={handleOnRemoveTag}
            />
        );
    };

    const columns = [
        {
            title: 'Ticket',
            render: (row: RelatedTicket) => (
                <Box direction="vertical">
                    <Text weight="bold">{row.subject}</Text>
                    <Text size="small" secondary>
                        {row.primaryTicketNumber}
                    </Text>
                </Box>
            ),
            width: '25%',
        },
        {
            title: 'Tags',
            render: (row: RelatedTicket) => <TagList tags={row.tags && row.tags.map(tag => ({ id: tag, children: tag })) || []} />,
            width: '25%',
        },
        {
            title: 'Last Updated',
            render: (row: RelatedTicket) => (
                <Text size="small" secondary>
                    {row._UpdatedDate}
                </Text>
            ),
            width: '25%',
        },
        {
            title: '',
            render: (row: RelatedTicket) => (
                <TableActionCell
                    moreActionsProps={{
                        skin: 'inverted',
                    }}
                    size="small"
                    primaryAction={{
                        text: 'View Ticket',
                        prefixIcon: <EyeIcon />,
                        skin: 'inverted',
                        onClick: () => { openRelatedTicket(row._id); },
                        visibility: 'always',
                    }}
                />
            ),
            width: 'auto',
        },
    ];

    return (
        <Box width="100%" height="100%" minHeight={0}>
            <Card dataHook="create-ticket-card" stretchVertically hideOverflow>
                <Card.Header
                    title="Find related tickets"
                    suffix={
                        <InfoIcon content="This feature helps you find tickets that are related to the current one. This requires both tickets to have tags." />
                    }
                />

                <Card.Content>
                    <Box height="100%" width="100%" minHeight={0}>
                        <Box direction="vertical" width="100%" height="100%" minHeight={0} gap={3}>
                            <Card>
                                <Card.Content size="none">
                                    <Box width="100%" verticalAlign="bottom" gap={3} padding={4}>
                                        <FormField label="Search Related Tickets by Tags">
                                            {renderTagsMultiSelect({ size: 'medium' })}
                                        </FormField>
                                        <Button onClick={onSearch} disabled={isLoading}>Search</Button>
                                    </Box>
                                </Card.Content>
                            </Card>
                            <Box height="100%" maxHeight="100%" overflow="auto">
                                <Table
                                    data={relatedTickets}
                                    columns={columns}
                                    showSelection
                                    showLastRowDivider
                                    showHeaderWhenEmpty
                                    dataHook="related-tickets-table"
                                    selectedIds={selectedIds}
                                    onSelectionChanged={(newIds) =>
                                        handleSelectionChanged((newIds ?? []) as string[])
                                    }
                                    skin="neutral"
                                >
                                    <TableToolbar >
                                        <TableToolbar.ItemGroup position="start">
                                            <TableToolbar.Item>
                                                <Box verticalAlign="middle">
                                                    <TableToolbar.Title>
                                                        Related Tickets
                                                    </TableToolbar.Title>
                                                    <TableToolbar.SelectedCount>
                                                        <Text weight="bold" size="small">
                                                            {selectedIds.length} Selected
                                                        </Text>
                                                    </TableToolbar.SelectedCount>
                                                </Box>
                                            </TableToolbar.Item>
                                        </TableToolbar.ItemGroup>
                                        <TableToolbar.ItemGroup position="end">
                                            <TableToolbar.Item layout="button">
                                                <Button
                                                    theme="whiteblueprimary"
                                                    disabled={selectedIds.length === 0}
                                                    onClick={() => handleSelectionChanged([])}
                                                    size="small"
                                                >
                                                    Clear Selection
                                                </Button>
                                            </TableToolbar.Item>
                                        </TableToolbar.ItemGroup>
                                    </TableToolbar>
                                    {isLoading && (
                                        <Table.EmptyState
                                            skin='page-no-border'
                                            title={<Loader size="small" />}
                                            subtitle="Searching for related tickets..."
                                        />
                                    )}
                                    {isError && (
                                        <Table.EmptyState
                                            skin='page-no-border'
                                            title={<Loader size="small" status='error' />}
                                            subtitle="Error searching for related tickets."
                                        />
                                    )}
                                    {relatedTickets.length > 0 && !isLoading && !isError && (
                                        <Table.Content titleBarVisible={true} />
                                    )}
                                    {relatedTickets.length === 0 && !isLoading && !isError && (
                                        <Table.EmptyState
                                            skin='page-no-border'
                                            title="No Related Tickets"
                                            subtitle="There are no related tickets to display."
                                        />
                                    )}
                                </Table>
                            </Box>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box >
    );
};

const TicketTeamPriorityState = ({
    assignedTeam,
    setTeam,
    priority,
    setPriority,
    status,
    setStatus,
    teamOptions,
    showValidationErrors,
}: {
    assignedTeam?: { id: string; name: string };
    setTeam: (value: { id: string; name: string }) => void;
    priority?: string;
    setPriority: (value: string) => void;
    status?: string;
    setStatus: (value: string) => void;
    teamOptions: { id: string; value: string }[];
    showValidationErrors: boolean;
}) => {
    return (
        <Box
            width="100%"
            height="100%"
            minHeight={0}
        >
            <Card
                dataHook="create-ticket-card"
            >
                <Card.Header title="Assign Team & Priority" />

                <Card.Content>
                    <Box
                        height="100%"
                        width="100%"
                        minHeight={0}
                    >
                        <Box
                            width="100%"
                            paddingTop="0px"
                        >
                            <Box
                                direction="vertical"
                                gap={2}
                                flexGrow={1}
                                minHeight={0}
                                boxSizing="border-box"
                                paddingTop={3}
                            >
                                <FormField
                                    label="Team"
                                    required
                                    status={showValidationErrors && !assignedTeam?.id ? 'error' : undefined}
                                    statusMessage={showValidationErrors && !assignedTeam?.id ? 'Select a team.' : undefined}
                                >
                                    <Dropdown
                                        size={ComponentsSize}
                                        options={teamOptions}
                                        selectedId={assignedTeam?.id}
                                        onSelect={(option) => {
                                            const team = { id: String(option.id), name: String(option.value) };
                                            setTeam(team);
                                        }
                                        }
                                    />
                                </FormField>

                                <FormField label="Priority" required>
                                    <Dropdown
                                        size={ComponentsSize}
                                        options={PRIORITY_OPTIONS}
                                        selectedId={priority}
                                        onSelect={(option) =>
                                            setPriority(String(option.id))
                                        }
                                    />
                                </FormField>

                                <FormField label="Status" required>
                                    <Dropdown
                                        size={ComponentsSize}
                                        options={STATUS_OPTIONS}
                                        selectedId={status}
                                        onSelect={(option) =>
                                            setStatus(String(option.id))
                                        }
                                    />
                                </FormField>
                            </Box>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
};

const ConfirmState = ({
    selectedMember,
    ticketSubject,
    ticketDescription,
    assignedTeam,
    priority,
    status,
    teamOptions,
    tags,
    relatedTickets,
}: {
    selectedMember: any;
    ticketSubject: string;
    ticketDescription: string;
    assignedTeam?: { id: string; name: string };
    priority?: string;
    status?: string;
    teamOptions: { id: string; value: string }[];
    tags: string[];
    relatedTickets: RelatedTicket[];
}) => {
    return (
        <Box
            width="100%"
            height="100%"
            minHeight={0}
        >
            <Card
                dataHook="create-ticket-card"
            >
                <Card.Header title="Confirm & Submit" />

                <Card.Content>
                    {/* SCROLL CONTAINER - guards against overflowing content */}
                    <Box
                        direction="vertical"
                        gap={5}
                        height="100%"
                        minHeight={0}
                        boxSizing="border-box"
                        overflowY="auto"
                    >
                        <Box direction="vertical" gap={2}>
                            <Text weight="bold" size="small">
                                Selected Member
                            </Text>

                            <SummaryRow
                                label="Name"
                                value={
                                    selectedMember?.name ||
                                        selectedMember?.contact?.firstName
                                        ? `${selectedMember?.contact?.firstName ?? ''} ${selectedMember?.contact?.lastName ?? ''}`.trim()
                                        : undefined
                                }
                            />

                            <SummaryRow
                                label="Email"
                                value={selectedMember?.loginEmail}
                            />
                        </Box>

                        <Divider />

                        <Box direction="vertical" gap={2}>
                            <Text weight="bold" size="small">
                                Ticket Details
                            </Text>

                            <SummaryRow
                                label="Subject"
                                value={ticketSubject}
                            />

                            <SummaryRow
                                label="Description"
                                value={ticketDescription}
                            />

                            <SummaryRow
                                label="Related Tickets"
                                value={relatedTickets.map(t => `#${t.primaryTicketNumber}`).join(', ')}
                            />
                            <SummaryRow
                                label="Tags"
                                value={tags.join(', ')}
                            />
                        </Box>

                        <Divider />

                        <Box direction="vertical" gap={2}>
                            <Text weight="bold" size="small">
                                Assignment
                            </Text>

                            <SummaryRow
                                label="Team"
                                value={getOptionValue(teamOptions, assignedTeam?.id)}
                            />

                            <SummaryRow
                                label="Priority"
                                value={getOptionValue(
                                    PRIORITY_OPTIONS,
                                    priority
                                )}
                            />

                            <SummaryRow
                                label="Status"
                                value={getOptionValue(
                                    STATUS_OPTIONS,
                                    status
                                )}
                            />
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
};

const CreateTicketModal = ({
    isOpen,
    onClose,
    agentId,
    userBetaFeatures,
    initialMemberId,
    chatConversationId,
}: {
    isOpen: boolean;
    onClose: () => void;
    agentId: string;
    userBetaFeatures: string[];
    initialMemberId?: string;
    chatConversationId?: string;
}) => {

    const isChatConversion = Boolean(initialMemberId && chatConversationId);
    const [activeStep, setActiveStep] = useState(0);
    const [isPrefillingChatMember, setIsPrefillingChatMember] = useState(false);
    const [validationAttemptedStep, setValidationAttemptedStep] = useState<number | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchMemberResults, setSearchMemberResults] =
        useState<MemberSearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedMember, setSelectedMember] =
        useState<any>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [teamOptions, setTeamOptions] = useState<{ id: string; value: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [relatedTickets, setRelatedTickets] = useState<RelatedTicket[]>([]);
    const [relatedTicketsChosen, setRelatedTicketsChosen] = useState<RelatedTicket[]>([]);
    const [gettingRelatedTickets, setGettingRelatedTickets] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorGettingRelatedTickets, setErrorGettingRelatedTickets] = useState(false);
    const [ticket, setTicket] = useState<CreateTicketPayload>({
        member: {
            memberId: '',
            memberName: '',
        },
        description: '',
        subject: '',
        status: 'open',
        priority: 'low',
        assignedTeam: {
            id: '',
            name: '',
        },
        submittingAgentId: agentId,
        tags: [],
    });

    // Helper functions to update ticket state
    const setTicketSubject = (value: string) => {
        setTicket(prev => ({ ...prev, subject: value }));
    };

    const setTicketDescription = (value: string) => {
        setTicket(prev => ({ ...prev, description: value }));
    };

    const setPriority = (value: string) => {
        setTicket(prev => ({ ...prev, priority: value as TicketPriority | `${TicketPriority}` }));
    };

    const setTicketStatus = (value: string) => {
        setTicket(prev => ({ ...prev, status: value as TicketStatus | `${TicketStatus}` }));
    };

    const setTeam = (value: { id: string; name: string }) => {
        setTicket(prev => ({ ...prev, assignedTeam: { id: value.id, name: value.name } }));
    };

    const setTicketTags = (tags: string[]) => {
        setTicket(prev => ({ ...prev, tags }));
    };

    useEffect(() => {
        const fetchTeams = async () => {
            const teamsData = await teams();
            // Convert team { id, name } to dropdown format { id, value }
            setTeamOptions(teamsData && teamsData.map(team => ({ id: team._id, value: team.name })) || []);
        };
        fetchTeams();
    }, []);

    const handleMemberSelect = async (member: MemberSearchResult) => {
        const memberId = member._id;
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/members/get?id=${encodeURIComponent(memberId)}`);
            if (!response.ok) {
                throw new Error('Unable to fetch member details');
            }
            const data = await response.json();
            const member = data.member;
            setSelectedMember(member);

            // Set member details in ticket
            const memberName = member?.name || `${member?.contact?.firstName ?? ''} ${member?.contact?.lastName ?? ''}`.trim();
            setTicket((prev: any) => ({
                ...prev,
                member: {
                    memberId: member._id,
                    memberName: memberName,
                },
            }));

            if (member?.contact?.addresses && member.contact.addresses.length > 0) {
                setAddresses([member.contact.addresses[0]]);
            } else {
                setAddresses([]);
            }
        } catch (error) {
            console.error('Error fetching member details:', error);
            ShowToast({ message: 'Failed to load member details. Please try again.', type: 'error' });
        }
    };

    useEffect(() => {
        if (isOpen && isChatConversion && initialMemberId) {
            setActiveStep(1);
            setIsPrefillingChatMember(true);
            void handleMemberSelect({ _id: initialMemberId } as MemberSearchResult)
                .finally(() => setIsPrefillingChatMember(false));
        }
    }, [isOpen, initialMemberId, isChatConversion]);

    const handleSearch = async () => {
        const query = searchInput.trim();
        setHasSearched(true);
        setIsSearching(true);
        if (!query) {
            setSearchMemberResults([]);
            setIsSearching(false);
            return;
        }

        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/members/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Unable to search members');
            }
            const data = await response.json();
            setSearchMemberResults(data.members || []);
            setIsSearching(false);
        } catch (error) {
            console.error('Error searching members:', error);
            setIsSearching(false);
            ShowToast({ message: 'Failed to search members. Please try again.', type: 'error' });
        }
    };

    const steps = [
        {
            text: 'Select Member',
            type: activeStep > 0 ? 'completed' : undefined,
        },
        {
            text: 'Ticket Details',
            type: activeStep > 1 ? 'completed' : undefined,
        },
        {
            text: 'Related Tickets',
            type: activeStep > 2 ? 'completed' : undefined,
        },
        {
            text: 'Assign Team & Priority',
            type: activeStep > 3 ? 'completed' : undefined,
        },
        {
            text: 'Confirm',
            type: activeStep > 4 ? 'completed' : undefined,
        },
    ].filter((_, index) => !isChatConversion || index !== 0);
    const currentStep = isChatConversion ? Math.max(activeStep, 1) : activeStep;
    const displayedActiveStep = isChatConversion ? currentStep - 1 : currentStep;

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const response = await createTicket({ ...ticket, submittingAgentId: agentId, relatedTickets: relatedTicketsChosen.map(t => t._id), ...(chatConversationId ? { chatConversationId } : {}) });

            // Check if response contains an error
            if (response.error) {
                ShowToast({ message: response.error || 'Failed to create ticket. Please try again.', type: 'error' });
                return;
            }

            ShowToast({ message: 'Ticket created successfully!', type: 'success' });
            setEmptyTicket();
            onClose();
        } catch (error) {
            console.error('Error creating ticket:', error);
            ShowToast({ message: 'Failed to create ticket. Please try again.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const setEmptyTicket = () => {
        setTicket({
            member: {
                memberId: '',
                memberName: '',
            },
            description: '',
            subject: '',
            status: 'open',
            priority: 'low',
            assignedTeam: {
                id: '',
                name: '',
            },
            submittingAgentId: agentId,
            tags: [],
        });
        setSearchMemberResults([]);
        setActiveStep(0);
        setValidationAttemptedStep(null);
        setSelectedMember(null);
        setSearchInput('');
        setHasSearched(false);
        setAddresses([]);
        setIsSearching(false);
        setRelatedTickets([]);
        setRelatedTicketsChosen([]);
        setGettingRelatedTickets(false);
        setErrorGettingRelatedTickets(false);
    };

    const handleGetRelatedTickets = async () => {
        try {
            setGettingRelatedTickets(true);
            setErrorGettingRelatedTickets(false);
            const response = await getRelatedTickets(ticket.tags || []);
            if (response.error) {
                ShowToast({ message: response.error || 'Failed to fetch related tickets. Please try again.', type: 'error' });
                setErrorGettingRelatedTickets(true);
                return;
            }
            setRelatedTickets(response.tickets || []);
        } catch (error) {
            console.error('Error fetching related tickets:', error);
            setErrorGettingRelatedTickets(true);
            ShowToast({ message: 'Failed to fetch related tickets. Please try again.', type: 'error' });
        } finally {
            setGettingRelatedTickets(false);
        }
    };

    const handleNextStep = () => {
        const finalStep = isChatConversion ? 4 : steps.length - 1;
        if (activeStep === finalStep) {
            handleSubmit();
            return;
        }

        const hasValidationError =
            (activeStep === 0 && !selectedMember) ||
            (activeStep === 1 && (!ticket.subject.trim() || !ticket.description.trim() || !ticket.tags?.length)) ||
            (activeStep === 3 && (!ticket.assignedTeam?.id || !ticket.priority || !ticket.status));

        if (hasValidationError) {
            setValidationAttemptedStep(activeStep);
            return;
        }
        setValidationAttemptedStep(null);

        const goingToRelatedTicketsStep = activeStep === 1;

        setActiveStep((prev) => Math.min(prev + 1, finalStep));

        if (goingToRelatedTicketsStep) {
            handleGetRelatedTickets();
        }
    };

    const handleDiscardAndClose = () => {
        onClose();
        setEmptyTicket();
    };

    return (
        <Modal
            isOpen={isOpen}
            screen="full"
            shouldCloseOnOverlayClick={false}
            onRequestClose={isSubmitting ? undefined : handleDiscardAndClose}
        >
            <CustomModalLayout
                title={
                    <CustomModalLayout.Title titleSize="medium">
                        Create Ticket
                    </CustomModalLayout.Title>
                }
                removeContentPadding
                subtitle="Fill in the details to create a new ticket"
                actionsSize={ComponentsSize}
                closeButtonProps={{
                    onClick: handleDiscardAndClose,
                    size: 'large'
                }}
                height="96vh"
                maxHeight="96vh"
                width="100vw"
                primaryButtonText={currentStep === (isChatConversion ? 4 : steps.length - 1) ? (isSubmitting ? <Loader size='tiny' /> : 'Submit') : 'Next'}
                primaryButtonProps={{
                    onClick: () => handleNextStep(),
                    disabled: isSubmitting || isPrefillingChatMember,
                }}
                secondaryButtonProps={{
                    onClick: () => {
                        setActiveStep((prev) => Math.max(prev - 1, 0));
                    },
                    disabled: isChatConversion || activeStep === 0 || isSubmitting,
                }}
                secondaryButtonText="Back"
                showHeaderDivider
                showFooterDivider
                overflowY="hidden"
                content={
                    <Box
                        direction="vertical"
                        height="100%"
                        minHeight={0}
                        flexGrow={1}
                        boxSizing="border-box"
                        overflow="hidden"
                    >
                        {/* STEPPER */}
                        <Box
                            padding={5}
                            flexShrink={0}
                        >
                            <Stepper
                                size="small"
                                activeStep={displayedActiveStep}
                                // @ts-ignore
                                steps={steps}
                            />
                        </Box>

                        <Divider />

                        {/* MAIN CONTENT */}
                        <Box
                            padding={3}
                            minHeight={0}
                            flexGrow={1}
                            height="100%"
                            boxSizing="border-box"
                            overflow="hidden"
                        >
                            {currentStep === 0 && !isChatConversion && (
                                <SelectMemberState
                                    searchInput={searchInput}
                                    setSearchInput={setSearchInput}
                                    searchMemberResults={
                                        searchMemberResults
                                    }
                                    hasSearched={hasSearched}
                                    selectedMember={selectedMember}
                                    handleMemberSelect={
                                        handleMemberSelect
                                    }
                                    handleSearch={handleSearch}
                                    addresses={addresses}
                                    setAddresses={setAddresses}
                                    isSearching={isSearching}
                                    showMemberError={validationAttemptedStep === 0 && !selectedMember}
                                />
                            )}

                            {currentStep === 1 && (
                                <TicketDetailsState
                                    ticketSubject={ticket.subject}
                                    setTicketSubject={setTicketSubject}
                                    ticketDescription={ticket.description}
                                    setTicketDescription={setTicketDescription}
                                    tags={ticket.tags}
                                    setTags={setTicketTags}
                                    userBetaFeatures={userBetaFeatures}
                                    showValidationErrors={validationAttemptedStep === 1}
                                />
                            )}

                            {currentStep === 2 && (
                                <RelatedTicketsState
                                    tags={ticket.tags}
                                    setTags={setTicketTags}
                                    relatedTickets={relatedTickets}
                                    isLoading={gettingRelatedTickets}
                                    isError={errorGettingRelatedTickets}
                                    onSelectionChange={setRelatedTicketsChosen}
                                    onSearch={handleGetRelatedTickets}
                                />
                            )}

                            {currentStep === 3 && (
                                <TicketTeamPriorityState
                                    assignedTeam={ticket.assignedTeam}
                                    setTeam={setTeam}
                                    priority={ticket.priority}
                                    setPriority={setPriority}
                                    status={ticket.status}
                                    setStatus={setTicketStatus}
                                    teamOptions={teamOptions}
                                    showValidationErrors={validationAttemptedStep === 3}
                                />
                            )}

                            {currentStep === 4 && (
                                <ConfirmState
                                    selectedMember={selectedMember}
                                    ticketSubject={ticket.subject}
                                    ticketDescription={ticket.description}
                                    assignedTeam={ticket.assignedTeam}
                                    priority={ticket.priority}
                                    status={ticket.status}
                                    teamOptions={teamOptions}
                                    relatedTickets={relatedTicketsChosen}
                                    tags={ticket.tags || []}
                                />
                            )}
                        </Box>
                    </Box>
                }
            />
        </Modal>
    );
};

export default CreateTicketModal;
