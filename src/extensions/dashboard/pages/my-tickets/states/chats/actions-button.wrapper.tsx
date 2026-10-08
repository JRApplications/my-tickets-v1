import { type FC } from 'react';
import { DropdownBase, Button, listItemActionBuilder } from '@wix/design-system';
import { ChevronDown, Visible } from '@wix/wix-ui-icons-common/odeditor';
import type { ChatActionsButtonWrapperProps } from './chats.types';

const ActionsButtonWrapper: FC<ChatActionsButtonWrapperProps> = ({ memberId, onViewMemberClicked, joinedChat, userType, onConvertToTicket, onTransferChat }) => {
    if (!joinedChat && userType !== 'member') {
        return null;
    }

    const options = [];
    if (userType === 'member' && memberId) {
        options.push(listItemActionBuilder({ id: 5, title: 'Convert to Ticket', onClick: onConvertToTicket }));
    }
    if (joinedChat && memberId && onViewMemberClicked) options.push(listItemActionBuilder({
        id: 4,
        title: 'View Member',
        prefixIcon: <Visible />,
        onClick: () => onViewMemberClicked(memberId),
    }));
    options.push(listItemActionBuilder({ id: 6, title: 'Transfer Chat', onClick: onTransferChat }));
    if (!options.length) return null;

    return (
        <DropdownBase options={options} appendTo={'window'} maxHeight={'400px'}>
            {({ toggle }) => (
                <Button size='medium' priority="secondary" onClick={toggle} suffixIcon={<ChevronDown />}>
                    Actions
                </Button>
            )}
        </DropdownBase>
    );
}

export default ActionsButtonWrapper;
