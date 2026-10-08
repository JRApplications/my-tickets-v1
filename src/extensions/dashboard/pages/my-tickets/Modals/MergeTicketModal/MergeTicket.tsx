import { Modal, CustomModalLayout, Box, Loader, FormField, Input, InputArea, Dropdown, Text } from '@wix/design-system';
import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { useMergeTicketModal } from './hooks/useMergeTicketModal';
import {
formatStatus,
formatPriority,
STATUS_OPTIONS, 
PRIORITY_OPTIONS,
type TicketStatus, 
type TicketPriority,
type Ticket,
} from '@jrapps/my_tickets_common_types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import styles from './MergeTicket.module.css';

interface MergeTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    primaryTicketId: string;
    secondaryTicketId: string;
    onMergeComplete?: (mergedTicketId: string, mergedTicketNumber: string) => void;
    agentId: string;
}

const MergeTicketModal = ({
    isOpen,
    onClose,
    primaryTicketId,
    secondaryTicketId,
    onMergeComplete,
    agentId
}: MergeTicketModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ticket[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSecondaryTicketId, setSelectedSecondaryTicketId] = useState(secondaryTicketId);

    // Reset modal state when it closes or when the primary ticket changes
    useEffect(() => {
        if (!isOpen) {
            setSelectedSecondaryTicketId('');
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setSelectedSecondaryTicketId('');
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [primaryTicketId, isOpen]);

    const {
        primaryTicket,
        secondaryTicket,
        isLoading,
        isError,
        isSaving,
        validationErrors,
        validationWarnings,
        canMerge,
        mergedTitle,
        finalStatus,
        finalPriority,
        selectedAgentId,
        mergeReason,
        updateMergedTitle,
        updateFinalStatus,
        updateFinalPriority,
        updateSelectedAgentId,
        updateMergeReason,
        handleMerge
    } = useMergeTicketModal(primaryTicketId, selectedSecondaryTicketId, isOpen, agentId);

    const handleSearchTickets = async () => {
        if (!searchQuery.trim()) {
            ShowToast({ message: 'Please enter a ticket number or subject', type: 'error' });
            return;
        }

        setIsSearching(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/queryTickets?query=${encodeURIComponent(searchQuery)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success && data.tickets) {
                setSearchResults(data.tickets.filter((t: any) => t._id !== primaryTicketId));
            } else {
                ShowToast({ message: 'No tickets found', type: 'error' });
                setSearchResults([]);
            }
        } catch (error) {
            ShowToast({ message: 'Failed to search tickets', type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectTicket = (ticketId: string) => {
        setSelectedSecondaryTicketId(ticketId);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleMergeClick = async () => {
        const result = await handleMerge();
        if (result.success && onMergeComplete) {
            onMergeComplete(result.mergedTicketId, result.mergedTicketNumber);
            onClose();
        }
    };

    // Get merged agent options from both tickets
    const getAgentOptions = () => {
        const agentSet = new Map<string, { id: string; value: string }>();

        if (primaryTicket?.assignedAgent) {
            agentSet.set(primaryTicket.assignedAgent.id, {
                id: primaryTicket.assignedAgent.id,
                value: primaryTicket.assignedAgent.name
            });
        }

        if (secondaryTicket?.assignedAgent) {
            agentSet.set(secondaryTicket.assignedAgent.id, {
                id: secondaryTicket.assignedAgent.id,
                value: secondaryTicket.assignedAgent.name
            });
        }

        primaryTicket?.agentsFollowing?.forEach((agent: any) => {
            if (!agentSet.has(agent.id)) {
                agentSet.set(agent.id, {
                    id: agent.id,
                    value: agent.name
                });
            }
        });

        secondaryTicket?.agentsFollowing?.forEach((agent: any) => {
            if (!agentSet.has(agent.id)) {
                agentSet.set(agent.id, {
                    id: agent.id,
                    value: agent.name
                });
            }
        });

        return Array.from(agentSet.values());
    };

    const agentOptions = getAgentOptions();

    // STEP 1: SELECT SECONDARY TICKET
    if (!selectedSecondaryTicketId) {
        return (
            <Modal isOpen={isOpen} shouldCloseOnOverlayClick={false} onRequestClose={isSaving ? undefined : onClose}>
                <CustomModalLayout
                    primaryButtonText={searchResults.length > 0 ? '' : 'Search'}
                    secondaryButtonText="Cancel"
                    closeButtonProps={{ onClick: onClose, size: 'large' }}
                    title={<CustomModalLayout.Title>Select Ticket to Merge</CustomModalLayout.Title>}
                    subtitle="Search for the second ticket you want to merge with this one"
                    primaryButtonProps={{
                        onClick: handleSearchTickets,
                        disabled: isSearching || !searchQuery.trim(),
                        style: { display: searchResults.length > 0 ? 'none' : 'block' }
                    }}
                    secondaryButtonProps={{
                        onClick: () => onClose(),
                        disabled: isSearching
                    }}
                    showHeaderDivider
                    showFooterDivider
                >
                    <Box direction='vertical' gap={3} paddingTop={1} paddingBottom={1}>
                        <FormField label='Search for Ticket' required>
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder='Enter ticket number, subject, or member name'
                            />
                        </FormField>

                        {isSearching && (
                            <Box align='center' direction='vertical' gap={1}>
                                <Loader status='loading' text='Searching tickets...' />
                            </Box>
                        )}

                        {searchResults.length > 0 && (
                            <Box direction='vertical' gap={2} borderTop='solid 1px #e0e0e0' paddingTop={2}>
                                <Text weight='bold' size='small'>
                                    Found {searchResults.length} ticket{searchResults.length !== 1 ? 's' : ''}:
                                </Text>
                                {searchResults.map((ticket: any) => (
                                    <div
                                        key={ticket._id}
                                        onClick={() => handleSelectTicket(ticket._id)}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: 'solid 1px #e0e0e0',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            backgroundColor: '#fafafa'
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0';
                                            (e.currentTarget as HTMLElement).style.borderColor = '#999';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa';
                                            (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0';
                                        }}
                                    >
                                        <Box direction='vertical' gap={1}>
                                            <Text weight='bold'>Ticket #{ticket.primaryTicketNumber}</Text>
                                            <Text size='small' color='#666'>
                                                {ticket.subject}
                                            </Text>
                                            <Box direction='horizontal' gap={1}>
                                                <Text size='small' color='#999'>
                                                    {formatStatus(ticket.status as TicketStatus)}
                                                </Text>
                                                <Text size='small' color='#999'>•</Text>
                                                <Text size='small' color='#999'>
                                                    {formatPriority(ticket.priority as TicketPriority)}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </div>
                                ))}
                            </Box>
                        )}
                    </Box>
                </CustomModalLayout>
            </Modal>
        );
    }

    // STEP 2: CONFIGURE MERGE
    return (
        <Modal isOpen={isOpen} shouldCloseOnOverlayClick={false} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                primaryButtonText={isSaving ? 'Merging...' : 'Merge Tickets'}
                secondaryButtonText={selectedSecondaryTicketId ? 'Change Ticket' : 'Cancel'}
                closeButtonProps={{ onClick: onClose, size: 'large' }}
                title={<CustomModalLayout.Title>Merge Tickets</CustomModalLayout.Title>}
                subtitle={'Combine two tickets into one. Original tickets will be marked as closed.'}
                primaryButtonProps={{
                    onClick: handleMergeClick,
                    disabled: isSaving || isLoading || !canMerge || validationErrors.length > 0
                }}
                secondaryButtonProps={{
                    onClick: selectedSecondaryTicketId ? () => setSelectedSecondaryTicketId('') : () => onClose(),
                    disabled: isSaving
                }}
                showHeaderDivider
                showFooterDivider
            >
                {/* LOADING STATE */}
                {isLoading && !isSaving && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='loading' text='Loading tickets...' />
                    </Box>
                )}

                {/* ERROR STATE */}
                {isError && !isSaving && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Box direction='vertical' gap={1}>
                            <Loader status='error' text={isError} />
                        </Box>
                    </Box>
                )}

                {/* SAVING STATE */}
                {isSaving && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='loading' text='Merging tickets...' />
                    </Box>
                )}

                {/* MAIN CONTENT */}
                {!isLoading && !isError && !isSaving && primaryTicket && secondaryTicket && (
                    <Box direction='vertical' gap={3} paddingTop={1} paddingBottom={1}>
                        {/* VALIDATION ERRORS */}
                        {validationErrors.length > 0 && (
                            <Box
                                className={styles.errorBox}
                                direction='vertical'
                                gap={1}
                                padding={2}
                                border='solid 1px'
                                borderColor='#f50057'
                                borderRadius='8px'
                                backgroundColor='#ffebee'
                            >
                                <Text size='small' weight='bold' color='#f50057'>
                                    Cannot merge: Validation errors
                                </Text>
                                {validationErrors.map((error, idx) => (
                                    <Text key={idx} size='small' color='#f50057'>
                                        • {error}
                                    </Text>
                                ))}
                            </Box>
                        )}

                        {/* VALIDATION WARNINGS */}
                        {validationWarnings.length > 0 && validationErrors.length === 0 && (
                            <Box
                                className={styles.warningBox}
                                direction='vertical'
                                gap={1}
                                padding={2}
                                border='solid 1px'
                                borderColor='#ff9800'
                                borderRadius='8px'
                                backgroundColor='#fff3e0'
                            >
                                <Text size='small' weight='bold' color='#ff9800'>
                                    Warnings
                                </Text>
                                {validationWarnings.map((warning, idx) => (
                                    <Text key={idx} size='small' color='#ff9800'>
                                        • {warning}
                                    </Text>
                                ))}
                            </Box>
                        )}

                        {/* TICKET SUMMARY CARDS */}
                        <Box direction='horizontal' gap={2}>
                            {/* PRIMARY TICKET CARD */}
                            <Box
                                flex='1'
                                border='solid 1px #e0e0e0'
                                borderRadius='8px'
                                padding={2}
                                backgroundColor='#fafafa'
                            >
                                <Box direction='vertical' gap={1}>
                                    <Text weight='bold'>Ticket #{primaryTicket.primaryTicketNumber}</Text>
                                    <Text size='small' color='#666'>
                                        {primaryTicket.subject}
                                    </Text>
                                    <Box direction='vertical' gap={0.5} marginTop={1}>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Status:</span>
                                            {formatStatus(primaryTicket.status as TicketStatus)}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Priority:</span>
                                            {formatPriority(primaryTicket.priority as TicketPriority)}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Assigned:</span>
                                            {primaryTicket.assignedAgent?.name || 'Unassigned'}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Messages:</span>
                                            {(primaryTicket.communication?.length || 0) + (primaryTicket.internalNotes?.length || 0)}
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>

                            {/* SECONDARY TICKET CARD */}
                            <Box
                                flex='1'
                                border='solid 1px #e0e0e0'
                                borderRadius='8px'
                                padding={2}
                                backgroundColor='#fafafa'
                            >
                                <Box direction='vertical' gap={1}>
                                    <Text weight='bold'>Ticket #{secondaryTicket.primaryTicketNumber}</Text>
                                    <Text size='small' color='#666'>
                                        {secondaryTicket.subject}
                                    </Text>
                                    <Box direction='vertical' gap={0.5} marginTop={1}>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Status:</span>
                                            {formatStatus(secondaryTicket.status as TicketStatus)}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Priority:</span>
                                            {formatPriority(secondaryTicket.priority as TicketPriority)}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Assigned:</span>
                                            {secondaryTicket.assignedAgent?.name || 'Unassigned'}
                                        </Text>
                                        <Text size='small'>
                                            <span style={{ color: '#999', marginRight: '8px' }}>Messages:</span>
                                            {(secondaryTicket.communication?.length || 0) + (secondaryTicket.internalNotes?.length || 0)}
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* MERGE CONFIGURATION */}
                        <Box direction='vertical' gap={2} borderTop='solid 1px #e0e0e0' paddingTop={2}>
                            <Text weight='bold' size='small'>Merge Configuration</Text>

                            <FormField label='Merged Ticket Subject' required>
                                <Input
                                    value={mergedTitle}
                                    onChange={(e) => updateMergedTitle(e.target.value)}
                                    placeholder='Enter subject for merged ticket'
                                />
                            </FormField>

                            <FormField label='Final Status' required>
                                <Dropdown
                                    options={STATUS_OPTIONS}
                                    selectedId={finalStatus}
                                    onSelect={(option) => updateFinalStatus(option.id as TicketStatus)}
                                    popoverProps={{ appendTo: 'window', zIndex: 10000 }}
                                />
                            </FormField>

                            <FormField label='Final Priority' required>
                                <Dropdown
                                    options={PRIORITY_OPTIONS}
                                    selectedId={finalPriority}
                                    onSelect={(option) => updateFinalPriority(option.id as TicketPriority)}
                                    popoverProps={{ appendTo: 'window', zIndex: 10000 }}
                                />
                            </FormField>

                            <FormField label='Assign Agent'>
                                <Dropdown
                                    options={agentOptions}
                                    selectedId={selectedAgentId}
                                    onSelect={(option) => updateSelectedAgentId(String(option.id))}
                                    placeholder='Select an agent (optional)'
                                    popoverProps={{ appendTo: 'window', zIndex: 10000 }}
                                />
                            </FormField>

                            <FormField label='Merge Reason (Optional)'>
                                <InputArea
                                    value={mergeReason}
                                    onChange={(e) => updateMergeReason(e.target.value)}
                                    placeholder='Why are these tickets being merged?'
                                    minHeight='80px'
                                />
                            </FormField>
                        </Box>

                        {/* PREVIEW */}
                        <Box
                            direction='vertical'
                            gap={1}
                            borderTop='solid 1px #e0e0e0'
                            paddingTop={2}
                            backgroundColor='#e3f2fd'
                            borderRadius='8px'
                            padding={2}
                        >
                            <Text weight='bold' size='small'>What will be merged:</Text>
                            <Text size='small'>
                                • All messages from both tickets ({(primaryTicket.communication?.length || 0) + (secondaryTicket.communication?.length || 0)} total)
                            </Text>
                            <Text size='small'>
                                • All internal notes ({(primaryTicket.internalNotes?.length || 0) + (secondaryTicket.internalNotes?.length || 0)} total)
                            </Text>
                            <Text size='small'>
                                • All followers ({(primaryTicket.agentsFollowing?.length || 0) + (secondaryTicket.agentsFollowing?.length || 0)} agents, {(primaryTicket.teamsFollowing?.length || 0) + (secondaryTicket.teamsFollowing?.length || 0)} teams)
                            </Text>
                            <Text size='small'>
                                • Both original tickets will be marked as "Closed"
                            </Text>
                        </Box>
                    </Box>
                )}
            </CustomModalLayout>
        </Modal>
    );
};

export default MergeTicketModal;