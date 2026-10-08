import { useEffect, useRef, useState } from 'react';
import { dashboard } from '@wix/dashboard';
import { Box, Text, IconButton } from '@wix/design-system';
import { ChevronUp, ChevronDown } from '@wix/wix-ui-icons-common/odeditor';

const DevTestOverrideProvider = ({ children, agentIdOverride, loggedInAgent }: { children: React.ReactNode, agentIdOverride: (any: any) => void, loggedInAgent: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDevTestOverride, setIsDevTestOverride] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
    const agent1 = {
        agentId: "0371ba30-5437-4796-b924-cd78dbf25cf7",
        teamId: "2e564ff8-39e6-48eb-b21d-f242cba8de6c",
        roleId: "1e982b0e-0779-4451-9d74-a451dba8409e",
        name: "Agent 1",
        teamName: "Team 1",
        roleName: "Test Role",
        permissions: [
            "my-tickets-view-teams",
            "my-tickets-create-teams",
            "my-tickets-edit-teams",
            "my-tickets-view-agents",
            "my-tickets-create-agents",
            "my-tickets-edit-agents",
            "my-tickets-change-agent-online-status",
            "my-tickets-view-roles",
            "my-tickets-create-roles",
            "my-tickets-edit-roles",
            "my-tickets-manage-chat-widget-settings",
            "my-tickets-view-single-ticket",
            "my-tickets-single-ticket-send-message",
            "my-tickets-change-ticket-priority",
            "my-tickets-change-ticket-status",
            "my-tickets-transfer-ticket",
            "my-tickets-close-single-ticket",
            "my-tickets-reopen-single-ticket",
            "my-tickets-merge-tickets",
            "my-tickets-access-internal-chat",
            "my-tickets-view-chats",
            "my-tickets-manage-member-tickets-design",
            "my-tickets-manage-chat-widget-design",
            "my-tickets-manage-ticket-tags",
            "my-tickets-manage-ticket-disposition",
            "my-tickets-view-workforce",
            "my-tickets-manage-sla-settings",
        ],
        agentProfilePictureUrl: "agent-profile-picture-url-placeholder"
    }
    const agent2 = {
        agentId: "869ed485-0477-41f6-84a5-d5d468bba52a",
        teamId: "bf494269-a5a0-4a9d-8e63-7043c9711cdf",
        roleId: "ee03fdb3-e6ac-4b10-9e66-d583b4d56987",
        name: "Agent 2",
        teamName: "Team 2",
        roleName: "Test Role",
        permissions: [
            "my-tickets-view-teams",
            "my-tickets-create-teams",
            "my-tickets-edit-teams",
            "my-tickets-view-agents",
            "my-tickets-create-agents",
            "my-tickets-edit-agents",
            "my-tickets-change-agent-online-status",
            "my-tickets-view-roles",
            "my-tickets-create-roles",
            "my-tickets-edit-roles",
            "my-tickets-manage-chat-widget-settings",
            "my-tickets-view-single-ticket",
            "my-tickets-single-ticket-send-message",
            "my-tickets-change-ticket-priority",
            "my-tickets-change-ticket-status",
            "my-tickets-transfer-ticket",
            "my-tickets-close-single-ticket",
            "my-tickets-reopen-single-ticket",
            "my-tickets-merge-tickets"
        ],
        agentProfilePictureUrl: "agent2-profile-picture-url-placeholder"
    }
    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        dragStateRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragStateRef.current) return;
        setPosition({
            left: e.clientX - dragStateRef.current.offsetX,
            top: e.clientY - dragStateRef.current.offsetY,
        });
    };

    const handleDragEnd = () => {
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, []);

    useEffect(() => {
        dashboard.observeState((componentParams: any) => {
            const currentUrl = componentParams?.location.search;
            const formattedUrl = new URL(currentUrl, 'https://example.com');
            const isDev = formattedUrl.search.includes('devOverride');
            if (isDev) {
                setIsDevTestOverride(true);
                const dev = formattedUrl.searchParams.get('devOverride');
                if (dev === 'agent1') {
                    agentIdOverride(agent1);
                } else if (dev === 'agent2') {
                    agentIdOverride(agent2);
                }
            } else {
                setIsDevTestOverride(false);
            }
        });
    }, []);
    return (
        <>
            {isDevTestOverride && <div style={{ position: 'absolute', top: position ? `${position.top}px` : '10px', left: position ? `${position.left}px` : '50%', transform: position ? 'none' : 'translateX(-50%)', zIndex: '9999', fontFamily: '"Fira Code", "Consolas", monospace' }}>
                <Box width='300px' backgroundColor='#f7f8fa' padding='10px' borderRadius='6px' border='1px solid #d6122e' direction='vertical' gap={1}>
                    <div onMouseDown={handleDragStart} style={{ cursor: 'move' }}>
                        <Box align='space-between' verticalAlign='middle' gap={2}>
                            <Text weight='bold' style={{ color: '#d6122e', letterSpacing: '1px' }}>{'>_ DEV TEST OVERRIDE ENABLED'}</Text>
                            <IconButton size='tiny' skin='light' onClick={() => setIsExpanded(!isExpanded)} onMouseDown={(e) => e.stopPropagation()}>
                                {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </IconButton>
                        </Box>
                    </div>
                    {isExpanded && (
                        <>
                            <Text style={{ color: '#5c5f6a' }}>Agent: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.name}</span></Text>
                            <Text style={{ color: '#5c5f6a' }}>Agent ID: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.agentId}</span></Text>
                            <Text style={{ color: '#5c5f6a' }}>Team: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.teamName}</span></Text>
                            <Text style={{ color: '#5c5f6a' }}>Team ID: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.teamId}</span></Text>
                            <Text style={{ color: '#5c5f6a' }}>Role: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.roleName}</span></Text>
                            <Text style={{ color: '#5c5f6a' }}>Role ID: <span style={{ color: '#20232a', fontWeight: 600 }}>{loggedInAgent.roleId}</span></Text>
                        </>
                    )}
                </Box>
            </div>}
            {children}
        </>
    )
};

export default DevTestOverrideProvider;
