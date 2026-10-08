import React from 'react';
import { Avatar, Box, IconButton, TableListItem, Text, CounterBadge } from '@wix/design-system';
import { FlagFilled } from '@wix/wix-ui-icons-common';
import { Delete, Flag } from '@wix/wix-ui-icons-common/odeditor';
import { formatTimestamp } from './formatTimestamp';

interface SidebarContentItemProps {
    onDeleteClicked: (mailId: string) => void;
    from: string;
    subject: string;
    timestamp?: number;
    onClick: () => void;
    isSelected: boolean;
    hasRead: boolean;
    isFlagged: boolean;
    internalChatClassName: string;
    mailId: string;
    agentId: string;
    onFlaggedClicked: (args: { isRemoving: boolean; isAdding: boolean; agentId: string; mailId: string }) => void;
}

const SidebarContentItem = React.memo(({
    from,
    subject,
    timestamp,
    onClick,
    isSelected,
    hasRead,
    isFlagged,
    internalChatClassName,
    mailId,
    agentId,
    onFlaggedClicked,
    onDeleteClicked
}: SidebarContentItemProps) => {
    return (
        <TableListItem
        checked={isSelected}
        checkbox={false}
            selectable={true}
            showSelectionBorder={true}
            border={true}
            onClick={onClick}
            verticalPadding='small'
            horizontalPadding='small'
            options={[
                ...!hasRead ? [{
                    value: <CounterBadge size="tiny" skin="standard" />,
                    width: 'auto',
                }] : [],
                {
                    value: <Avatar name={from} size="size48" />,
                    width: 'auto',
                },
                {
                    value: (
                        <Box direction="vertical">
                            <Text weight="normal">{from}</Text>
                            <Text size="small" secondary>
                                {subject}
                            </Text>
                        </Box>
                    ),
                },
                {
                    value: (
                        <Box direction="vertical" align="right" verticalAlign="middle" gap="8px">
                            <Text size="tiny" secondary>
                                {formatTimestamp(timestamp)}
                            </Text>

                            <Box className={`${internalChatClassName}-actions`} gap="8px">
                                <IconButton
                                    size="small"
                                    priority={isFlagged ? 'primary' : 'secondary'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFlaggedClicked({ isRemoving: isFlagged, isAdding: !isFlagged, agentId, mailId });
                                    }}
                                >
                                    {isFlagged ? <FlagFilled /> : <Flag />}
                                </IconButton>

                                <IconButton
                                    size="small"
                                    priority="secondary"
                                    skin="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteClicked(mailId);
                                    }}
                                >
                                    <Delete />
                                </IconButton>
                            </Box>
                        </Box>
                    ),
                    width: 'auto'
                }
            ]}
        />
    );
});

export default SidebarContentItem;