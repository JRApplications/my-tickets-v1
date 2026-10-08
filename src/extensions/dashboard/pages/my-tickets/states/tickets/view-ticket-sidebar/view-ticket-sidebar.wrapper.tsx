import { type FC, useState } from 'react';
import {
    formatStatus,
    getStatusSkin,
    formatPriority,
    getPrioritySkin,
    type TicketStatus,
    type TicketPriority
} from '@jrapps/my_tickets_common_types';
import {
    Badge,
    Box,
    Text,
    Heading,
    Divider,
    SidePanel,
    TagList,
    IconButton,
    Input,
    Button,
} from '@wix/design-system';
import {
    Time as TimeIcon,
    UserChecked as UserCheckedIcon,
    Duplicate as DuplicateIcon,
    User as UserIcon,
    Users as UsersIcon,
    Edit as EditIcon,
    Page as PageIcon,
    Tag as TagIcon
} from '@wix/wix-ui-icons-common/odeditor';

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
        return dateStr;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
};

import type { ViewTicketSidebarWrapperProps } from '../tickets.types';

const ViewTicketSidebarWrapper: FC<ViewTicketSidebarWrapperProps> = ({
    status,
    priority,
    ticketId,
    createdDate,
    updatedDate,
    onCloseTicketSidebar,
    assignedTeam,
    assignedAgent,
    agentsFollowing,
    teamsFollowing,
    ticketNumber,
    tags,
    onTagsChange,
    onTicketAction,
    isSpam,
    isDeleted,
    relatedTickets,
    mergeSummary,
    permissions
}) => {
    const [newTag, setNewTag] = useState('');
    const handleCopyTicketId = () => {
        if (ticketNumber) {
            navigator.clipboard.writeText(ticketNumber);
        }
    };

    return (
        <SidePanel
            width='100%'
            height='100%'
            hideOverflow
            closeButtonProps={{
                onClick: onCloseTicketSidebar
            }}
        >
            <SidePanel.Header title={<Heading size="large">Ticket Details</Heading>} />
            <SidePanel.Content>
                <Box direction='vertical' padding='SP3' gap='SP3'>
                    {onTicketAction && permissions.includes("my-tickets-manage-ticket-disposition") && (
                        <Box direction="horizontal" gap="SP2">
                            {(isSpam || isDeleted) ? (
                                <Button size="small" priority="secondary" onClick={() => { void onTicketAction('restore').catch(() => undefined); }}>Restore ticket</Button>
                            ) : (
                                <>
                                    <Button size="small" priority="secondary" onClick={() => { void onTicketAction('spam').catch(() => undefined); }}>Mark as spam</Button>
                                    <Button size="small" skin="destructive" onClick={() => { void onTicketAction('delete').catch(() => undefined); }}>Delete</Button>
                                </>
                            )}
                        </Box>
                    )}
                    <Box direction='horizontal' gap='SP3' align='space-between' verticalAlign='middle'>
                        <Box boxSizing='border-box' width='100%' WebkitJustifyContent='space-between' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                            {ticketId && (
                                <Box direction='horizontal' gap='SP2' verticalAlign='middle'>
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Ticket number
                                        </Text>
                                        <Box gap={3}>
                                            <Text weight='bold'>{ticketNumber || '—'}</Text>
                                            <IconButton
                                                skin='standard'
                                                priority='secondary'
                                                size='tiny'
                                                onClick={handleCopyTicketId}
                                                ariaLabel='Copy ticket ID'
                                            >
                                                <DuplicateIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                </Box>
                            )}
                            <Divider direction='vertical' />
                            <Box direction='horizontal' gap='SP2' verticalAlign='middle'>
                                {status && (
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Status
                                        </Text>
                                        <Badge size='tiny' skin={getStatusSkin(status as TicketStatus)}>
                                            {formatStatus(status as TicketStatus)}
                                        </Badge>
                                    </Box>
                                )}
                                {priority && (
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Priority
                                        </Text>
                                        <Badge size='tiny' skin={getPrioritySkin(priority as TicketPriority)}>
                                            {formatPriority(priority as TicketPriority)}
                                        </Badge>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>



                    <Box direction='vertical' gap='SP3'>
                        <Box direction='horizontal' align='left' verticalAlign='middle' gap='SP2'>
                            <TimeIcon />
                            <Heading size='small'>Timeline</Heading>
                        </Box>
                        <Box boxSizing='border-box' width='100%' direction='vertical' gap='SP3' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                            {createdDate && (
                                <Box gap='SP3'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' borderRadius='50%'>
                                        <PageIcon size='28px' />
                                    </Box>
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Created
                                        </Text>
                                        <Text>{formatDate(createdDate)}</Text>
                                    </Box>
                                </Box>
                            )}
                            {updatedDate && (
                                <Box gap='SP3'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' borderRadius='50%'>
                                        <EditIcon size='28px' />
                                    </Box>
                                    <Box direction='vertical' gap='SP1'>

                                        <Text size='small' secondary>
                                            Last updated
                                        </Text>
                                        <Text>{formatDate(updatedDate)}</Text>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>


                    <Box direction='vertical' gap='SP3' boxSizing='border-box'>
                        <Box direction='horizontal' align='left' verticalAlign='middle' gap='SP2'>
                            <UserCheckedIcon />
                            <Heading size='small'>Ownership</Heading>
                        </Box>
                        <Box boxSizing='border-box' width='100%' direction='vertical' gap='SP3' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                            {assignedAgent && (
                                <Box direction='horizontal' gap='SP3' align='left' verticalAlign='middle'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' backgroundColor='#b9b3b338' borderRadius='50%'>
                                        <UserIcon size='28px' />
                                    </Box>

                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Assigned Agent
                                        </Text>
                                        <Text>{assignedAgent.name}</Text>
                                    </Box>
                                </Box>
                            )}
                            <Divider />
                            {assignedTeam && (
                                <Box direction='horizontal' gap='SP3' align='left' verticalAlign='middle'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' backgroundColor='#b9b3b338' borderRadius='50%'>
                                        <UsersIcon size='28px' />
                                    </Box>
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Assigned Team
                                        </Text>
                                        <Text>{assignedTeam.name}</Text>
                                    </Box>
                                </Box>
                            )}
                            <Divider />
                            {teamsFollowing && teamsFollowing.length > 0 && (
                                <Box direction='horizontal' gap='SP3' align='left' verticalAlign='middle'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' backgroundColor='#b9b3b338' borderRadius='50%'>
                                        <UsersIcon size='28px' />
                                    </Box>
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Teams Following
                                        </Text>
                                        <TagList
                                            tags={teamsFollowing.map(team => ({ id: team.id, removable: false, children: team.name, theme: assignedTeam?.id === team.id ? 'success' : undefined }))}
                                            maxVisibleTags={3}
                                            toggleMoreButton={(amountOfHiddenTags, isExpanded) => ({
                                                label: isExpanded ? 'Show Less' : `+${amountOfHiddenTags} More`,
                                                tooltipContent: !isExpanded && 'Show More',
                                            })}
                                        />
                                    </Box>
                                </Box>
                            )}
                            <Divider />
                            {agentsFollowing && agentsFollowing.length > 0 && (
                                <Box direction='horizontal' gap='SP3' align='left' verticalAlign='middle'>
                                    <Box height='38px' width='38px' align='center' verticalAlign='middle' backgroundColor='#b9b3b338' borderRadius='50%'>
                                        <UsersIcon size='28px' />
                                    </Box>
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Agents Following
                                        </Text>
                                        <TagList
                                            tags={agentsFollowing.map(agent => ({ id: agent.id, removable: false, children: agent.name, theme: assignedAgent?.id === agent.id ? 'success' : undefined }))}
                                            maxVisibleTags={3}
                                            toggleMoreButton={(amountOfHiddenTags, isExpanded) => ({
                                                label: isExpanded ? 'Show Less' : `+${amountOfHiddenTags} More`,
                                                tooltipContent: !isExpanded && 'Show More',
                                            })}
                                        />
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {mergeSummary && (
                        <Box direction='vertical' gap='SP3' boxSizing='border-box'>
                            <Box direction='horizontal' align='left' verticalAlign='middle' gap='SP2'>
                                <DuplicateIcon />
                                <Heading size='small'>Merge Info</Heading>
                            </Box>
                            <Box boxSizing='border-box' width='100%' direction='vertical' gap='SP3' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                                {mergeSummary.mergedIntoTicketId ? (
                                    <>
                                        <Box direction='vertical' gap='SP1'>
                                            <Text size='small' secondary>
                                                Merged Into
                                            </Text>
                                            <Text weight='bold'>Ticket #{mergeSummary.mergedIntoTicketId}</Text>
                                        </Box>
                                        {mergeSummary.originalTicketIds && mergeSummary.originalTicketIds.length > 0 && (
                                            <Box direction='vertical' gap='SP1'>
                                                <Text size='small' secondary>
                                                    Original Tickets
                                                </Text>
                                                <TagList
                                                    tags={mergeSummary.originalTicketIds.map((num: string) => ({ id: num, removable: false, children: `Ticket #${num}` }))}
                                                    maxVisibleTags={5}
                                                />
                                            </Box>
                                        )}
                                    </>
                                ) : null}
                                {mergeSummary.mergedAt && (
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Merged At
                                        </Text>
                                        <Text>{formatDate(new Date(mergeSummary.mergedAt).toISOString())}</Text>
                                    </Box>
                                )}
                                {mergeSummary.mergedBy && (
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Merged By
                                        </Text>
                                        <Text>{mergeSummary.mergedBy}</Text>
                                    </Box>
                                )}
                                {mergeSummary.reason && (
                                    <Box direction='vertical' gap='SP1'>
                                        <Text size='small' secondary>
                                            Reason
                                        </Text>
                                        <Text>{mergeSummary.reason}</Text>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}

                    <Box direction='vertical' gap='SP3' boxSizing='border-box'>
                        <Box direction='horizontal' align='left' verticalAlign='middle' gap='SP2'>
                            <TagIcon />
                            <Heading size='small'>Related Tickets</Heading>
                        </Box>
                        <Box boxSizing='border-box' width='100%' direction='vertical' gap='SP3' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                            {relatedTickets && relatedTickets.length > 0 && (
                                <TagList
                                    tags={relatedTickets.map(tag => ({ id: tag, removable: false, children: `#${tag}` }))}
                                    maxVisibleTags={3}
                                    toggleMoreButton={(amountOfHiddenTags, isExpanded) => ({
                                        label: isExpanded ? 'Show Less' : `+${amountOfHiddenTags} More`,
                                        tooltipContent: !isExpanded && 'Show More',
                                    })}
                                />
                            )}
                            {(!relatedTickets || relatedTickets.length === 0) && (
                                <Text size='small' color='text-secondary'>No related tickets</Text>
                            )}
                        </Box>
                    </Box>

                    <Box direction='vertical' gap='SP3' boxSizing='border-box'>
                        <Box direction='horizontal' align='left' verticalAlign='middle' gap='SP2'>
                            <TagIcon />
                            <Heading size='small'>Tags</Heading>
                        </Box>
                        <Box boxSizing='border-box' width='100%' direction='vertical' gap='SP3' border='1px solid #e0e0e0' borderRadius='8px' padding='SP3'>
                            {tags && tags.length > 0 && (
                                <TagList
                                    tags={tags.map(tag => ({ id: tag, removable: Boolean(onTagsChange), children: tag }))}
                                    onTagRemove={onTagsChange ? (id) => onTagsChange(tags.filter(tag => tag !== id)) : undefined}
                                    maxVisibleTags={3}
                                    toggleMoreButton={(amountOfHiddenTags, isExpanded) => ({
                                        label: isExpanded ? 'Show Less' : `+${amountOfHiddenTags} More`,
                                        tooltipContent: !isExpanded && 'Show More',
                                    })}
                                />
                            )}
                            {onTagsChange && (
                                <Box direction="horizontal" gap="SP2" verticalAlign="middle">
                                    <Input size="small" value={newTag} placeholder="Add a tag" onChange={(event) => setNewTag(event.target.value)} />
                                    <Button size="small" prefixIcon={<TagIcon />} disabled={!newTag.trim() || tags.includes(newTag.trim())} onClick={() => {
                                        const tag = newTag.trim();
                                        if (!tag || tags.includes(tag)) return;
                                        onTagsChange([...tags, tag]);
                                        setNewTag('');
                                    }}>Add</Button>
                                </Box>
                            )}
                            {(!tags || tags.length === 0) && (
                                <Text size='small' color='text-secondary'>No tags</Text>
                            )}
                        </Box>
                    </Box>
                </Box>
            </SidePanel.Content>
        </SidePanel>
    )
}

export default ViewTicketSidebarWrapper;
