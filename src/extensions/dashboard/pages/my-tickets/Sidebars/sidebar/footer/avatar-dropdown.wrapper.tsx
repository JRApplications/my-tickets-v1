import { type FC } from 'react';
import {
    Avatar,
    listItemActionBuilder,
    DropdownBase,
    TextButton,
    listItemSectionBuilder,
    listItemSelectBuilder,
    Box,
    Text,
    SkeletonCircle,
    SkeletonLine
} from '@wix/design-system';
import StatusDots from './status-dots.wrapper';
import { ChevronDown } from '@wix/wix-ui-icons-common/odeditor';

type Status = 'online' | 'busy' | 'offline';

interface AvatarDropdownWrapperProps {
    status?: Status;
    onStatusChange?: (status: Status) => void;
    onLogout?: () => void;
    permissions: string[];
    agentProfilePictureUrl: string;
    agentName: string;
    agentRole: string;
    minimised: boolean;
    isLoading?: boolean;
}

const AvatarDropdown: FC<AvatarDropdownWrapperProps> = ({ status = 'online', onStatusChange, onLogout, permissions, agentProfilePictureUrl, agentName, agentRole, minimised, isLoading }) => {
    const selectedStatus = status;

    const handleStatusChange = (newStatus: Status) => {
        if (onStatusChange) {
            onStatusChange(newStatus);
        }
    };

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };

    const options = [
        listItemSectionBuilder({
            id: 'status-section',
            title: 'Online Status',
        }),
        listItemSelectBuilder({
            id: 'online',
            checkbox: true,
            prefix: <StatusDots.Online />,
            title: 'Online',
            disabled: !permissions?.includes('my-tickets-change-agent-online-status'),
        }),
        listItemSelectBuilder({
            id: 'busy',
            checkbox: true,
            prefix: <StatusDots.Away />,
            title: 'Away',
            disabled: !permissions?.includes('my-tickets-change-agent-online-status'),
        }),
        listItemSelectBuilder({
            id: 'offline',
            checkbox: true,
            prefix: <StatusDots.DoNotDisturb />,
            title: 'Offline',
            disabled: !permissions?.includes('my-tickets-change-agent-online-status'),
        }),
        { id: 'divider-1', value: '-' },
        listItemActionBuilder({
            id: 0,
            title: 'Logout',
            onClick: handleLogout,
        }),
    ];

    return (
        <DropdownBase zIndex={9999} appendTo={'window'} fluid minWidth={0} options={options} selectedId={selectedStatus} onSelect={(option: any) => typeof option.id === 'string' && handleStatusChange(option.id as Status)}>
            {({ toggle }: any) => (
                <TextButton fluid onClick={toggle} disabled={isLoading}>
                    <Box verticalAlign='middle' align='left' gap={2} width='100%' minWidth={0}>
                        {isLoading ? <SkeletonCircle diameter={'30px'} /> : <Avatar
                            presence={selectedStatus}
                            name={agentName && !agentProfilePictureUrl ? agentName : undefined}
                            size="size30"
                            imgProps={(!agentName && agentProfilePictureUrl || agentName && agentProfilePictureUrl) ? { src: agentProfilePictureUrl } : undefined}
                        />}
                        {minimised ? null : <Box direction='horizontal' verticalAlign='middle' align='space-between' width='100%' minWidth={0}>
                            <Box direction='vertical' gap={isLoading ? 1 : 0} align='left' verticalAlign='middle' minWidth={0}>
                                {isLoading ? <SkeletonLine width="100px" /> : <Text weight='bold' size='small' ellipsis>{agentName ?? 'Error getting name'}</Text>}
                                {isLoading ? <SkeletonLine width="50px" /> : <Text size="tiny" secondary ellipsis>{agentRole ?? 'Error getting role'}</Text>}
                            </Box>
                            <ChevronDown />
                        </Box>}
                    </Box>
                </TextButton>
            )}
        </DropdownBase>
    )
}

export default AvatarDropdown;
