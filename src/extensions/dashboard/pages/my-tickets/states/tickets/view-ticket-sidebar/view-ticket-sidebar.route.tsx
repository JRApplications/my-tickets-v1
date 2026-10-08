import { type FC } from 'react';

import ViewTicketSidebarWrapper from './view-ticket-sidebar.wrapper';

import type { ViewTicketSidebarProps } from '../tickets.types';

const ViewTicketSidebar: FC<ViewTicketSidebarProps> = ({
    status,
    priority,
    assignedTeam,
    assignedAgent,
    agentsFollowing,
    teamsFollowing,
    ticketId,
    ticketNumber,
    createdDate,
    updatedDate,
    onCloseTicketSidebar, 
    tags,
    onTagsChange,
    onTicketAction,
    isSpam,
    isDeleted,
    mergeSummary,
    relatedTickets,
    permissions,
}) => {
    return (
        <ViewTicketSidebarWrapper
            status={status}
            priority={priority}
            assignedTeam={assignedTeam}
            assignedAgent={assignedAgent}
            agentsFollowing={agentsFollowing}
            teamsFollowing={teamsFollowing}
            ticketId={ticketId}
            ticketNumber={ticketNumber}
            createdDate={createdDate}
            updatedDate={updatedDate}
            onCloseTicketSidebar={onCloseTicketSidebar}
            tags={tags}
            onTagsChange={onTagsChange}
            onTicketAction={onTicketAction}
            isSpam={isSpam}
            isDeleted={isDeleted}
            mergeSummary={mergeSummary}
            relatedTickets={relatedTickets}
            permissions={permissions}
        />
    )
}

export default ViewTicketSidebar;
