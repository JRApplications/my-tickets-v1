import { Box, Text, Button, Divider, SegmentedToggle, Card, CounterBadge, Search, Loader } from '@wix/design-system';
import { Add } from '@wix/wix-ui-icons-common/odeditor';
import { useCallback, useMemo, useState } from 'react';
import './internal-chat.css';
import CreateMail from './states/create-mail';
import ViewMail from './states/view-mail';
import SidebarContentItem from './SideBarContentItem';
import SidebarContentItemLoading from './SidebarContentItemLoading';

interface InternalChatWrapperProps {
    handleDeleteMail: (mailId: string) => Promise<void>;
    onSelectItem: (itemId: any) => void;
    selectedItem: any;
    items: any[];
    isSendingMessage: boolean;
    handleSendMessage: ({ message, attachments, mailId, agentId }: { message: string; attachments: any[]; mailId: string | null; agentId: string }) => Promise<{ success: boolean; updatedConversation?: any }>;
    agentId: string;
    isCreatingNew: boolean;
    onNewButtonClick: () => void;
    addressBook: Array<{ _id: string; name: string; email: string; agentId?: string; teamId?: string; isAgent: boolean; isTeam: boolean }>;
    onCancelCreateNew: () => void;
    onCreateNewSendButtonClicked: (message: string, subject: string, attachments: Array<{ id: string; name: string; url: string }>, selectedAddresses: Array<{ _id: string; name: string; email: string; agentId?: string; teamId?: string; isAgent: boolean; isTeam: boolean }>) => Promise<boolean>;
    handleFlaggedClicked: (item: { isRemoving: boolean; isAdding: boolean; agentId: string; mailId: string }) => void;
    allMailNumber: number;
    unreadMailNumber: number;
    flaggedMailNumber: number;
    isSidebarLoading: boolean;
    isSidebarError: boolean;
    onAiButtonClicked: () => void;
    permissions?: any;
}

const InternalChatWrapper = ({
    onSelectItem,
    selectedItem,
    items,
    isSendingMessage,
    handleSendMessage,
    agentId,
    isCreatingNew,
    onNewButtonClick,
    addressBook,
    onCancelCreateNew,
    onCreateNewSendButtonClicked,
    handleFlaggedClicked,
    allMailNumber,
    unreadMailNumber,
    flaggedMailNumber,
    isSidebarLoading,
    isSidebarError,
    permissions,
    handleDeleteMail
}: InternalChatWrapperProps) => {
    const internalChatClassName = "internal-chat";
    const currentUrl = new URL(import.meta.url).origin;
    const [mailSearch, setMailSearch] = useState('');
    const [mailFilter, setMailFilter] = useState<'all' | 'unread' | 'flagged'>('all');
    const visibleItems = useMemo(() => {
        const query = mailSearch.trim().toLowerCase();
        return items.filter((item) => {
            const matchesFilter = mailFilter === 'all'
                || (mailFilter === 'unread' && !item.hasRead)
                || (mailFilter === 'flagged' && item.isFlagged);
            const matchesSearch = !query
                || item.subject?.toLowerCase().includes(query)
                || item.from?.toLowerCase().includes(query)
                || item.email?.toLowerCase().includes(query);
            return matchesFilter && matchesSearch;
        });
    }, [items, mailFilter, mailSearch]);

    // Stable per-item callbacks — recreated only when their dependencies change,
    // not on every render, so React.memo on SidebarContentItem can do its job.
    const handleSelectItem = useCallback((item: any) => {
        onSelectItem(item);
    }, [onSelectItem]);

    const handleFlagClick = useCallback((args: { isRemoving: boolean; isAdding: boolean; agentId: string; mailId: string }) => {
        handleFlaggedClicked(args);
    }, [handleFlaggedClicked]);

    // Find the flagged state for the currently selected item so ViewMail can use it.
    const selectedItemData = items.find(i => i._id === selectedItem) ?? null;

    return (
        <Box className={`${internalChatClassName}-wrapper`} width={'100%'} height={'100%'}>
            <Box className={`${internalChatClassName}-sidebar`} width={'400px'} direction={'vertical'}>
                <Card stretchVertically  className='internal-mail-sidebar-card'>
                    <Card.Content size='none' dataHook="internal-chat-sidebar-content">
                        <Box className={`${internalChatClassName}-sidebar-header`} direction={'vertical'} >
                            <Box padding={'15px'} width={'100%'} boxSizing={'border-box'} WebkitJustifyContent={'space-between'} align={'center'}>
                                <Box gap={1}>
                                    <img width={'37px'} height={'37px'} src={currentUrl + '/logo.png'} alt="My Tickets Logo" className={`${internalChatClassName}-logo`} />
                                    <Box direction={'vertical'} paddingLeft={'5px'}>
                                        <Text className={`${internalChatClassName}-header-title`}>My Tickets</Text>
                                        <Text className={`${internalChatClassName}-header-subtitle`}>Internal Mail</Text>
                                    </Box>
                                </Box>
                                <Box verticalAlign={'middle'} WebkitJustifyContent={'center'} align={'center'}>
                                    {permissions.includes("my-tickets-access-internal-chat") && <Button size={'small'} prefixIcon={<Add />} onClick={onNewButtonClick}>New</Button>}
                                </Box>
                            </Box>
                            <Divider className={`${internalChatClassName}-divider`} skin={'light'} />
                            <Box padding={'15px'} width={'100%'} boxSizing={'border-box'} WebkitJustifyContent={'space-between'} align={'center'} direction={'vertical'} gap={3}>
                                <Box width={'100%'}>
                                    {permissions.includes("my-tickets-access-internal-chat") && <Search className={`${internalChatClassName}-search`} placeholder="Search mail..." size={'medium'} value={mailSearch} onChange={(event) => setMailSearch(event.target.value)} clearButton onClear={() => setMailSearch('')} />}
                                </Box>
                                <SegmentedToggle size="small" selected={mailFilter} onClick={(_event, value) => setMailFilter(value as 'all' | 'unread' | 'flagged')} fullWidth>
                                    <SegmentedToggle.Button value="all">
                                        {<Box gap={1} verticalAlign={'middle'}><Text>All</Text><CounterBadge skin="standard">{String(allMailNumber)}</CounterBadge></Box>}
                                    </SegmentedToggle.Button>
                                    <SegmentedToggle.Button value="unread">
                                        {<Box gap={1} verticalAlign={'middle'}><Text>Unread</Text><CounterBadge skin="neutralStandard">{String(unreadMailNumber)}</CounterBadge></Box>}
                                    </SegmentedToggle.Button>
                                    <SegmentedToggle.Button value="flagged">
                                        {<Box gap={1} verticalAlign={'middle'}><Text>Flagged</Text><CounterBadge skin="warning">{String(flaggedMailNumber)}</CounterBadge></Box>}
                                    </SegmentedToggle.Button>
                                </SegmentedToggle>
                            </Box>
                        </Box>
                        <Divider />
                        <Box direction={'vertical'} flexGrow={1} overflowY="auto" verticalAlign={'top'}>

                            {!permissions.includes("my-tickets-access-internal-chat") && (
                                <Box direction='vertical' verticalAlign={'middle'} height="100%" width='100%'>
                                    <Loader size="medium" status="error" text="You do not have the necessary permissions to access the internal chat." />
                                </Box>
                            )}
                            
                            {isSidebarLoading && permissions.includes("my-tickets-access-internal-chat") && (
                                <Box padding="12px 16px" direction='vertical' gap="12px" overflowY="auto">
                                    <SidebarContentItemLoading />
                                    <SidebarContentItemLoading />
                                    <SidebarContentItemLoading />
                                    <SidebarContentItemLoading />
                                </Box>
                            )}
                            {isSidebarError && permissions.includes("my-tickets-access-internal-chat") && (
                                <Box width={'100%'} height={'100%'} align={'center'} WebkitJustifyContent={'center'} verticalAlign={'middle'}>
                                    <Loader status="error" text="Failed to load mail. Please try again." />
                                </Box>
                            )} 
                            {items && !isSidebarError && !isSidebarLoading && permissions.includes("my-tickets-access-internal-chat") && visibleItems.length > 0 && (
                                <Box padding="12px 16px" direction='vertical' gap="12px" overflowY="auto">
                                    {visibleItems.map((item) => (
                                        <SidebarContentItem
                                            key={item._id}
                                            from={item.from}
                                            hasRead={item.hasRead}
                                            isFlagged={item.isFlagged}
                                            subject={item.subject}
                                            onClick={() => handleSelectItem(item)}
                                            isSelected={selectedItem === item._id}
                                            timestamp={item.timestamp}
                                            internalChatClassName={internalChatClassName}
                                            onFlaggedClicked={handleFlagClick}
                                            onDeleteClicked={handleDeleteMail}
                                            agentId={agentId}
                                            mailId={item._id}
                                        />
                                    ))}
                                </Box>
                            )}
                            {!isSidebarLoading && !isSidebarError && permissions.includes("my-tickets-access-internal-chat") && visibleItems.length === 0 && (
                                <Box width={'100%'} height={'100%'} align={'center'} WebkitJustifyContent={'center'} verticalAlign={'middle'}>
                                    <Text>{items.length === 0 ? 'No mail available' : 'No mail matches your search or filter'}</Text>
                                </Box>
                            )}
                        </Box>
                    </Card.Content>
                </Card>
            </Box>



            <Box className={`${internalChatClassName}-content`} width={'100%'} height={'100%'}>
                {!selectedItem && !isCreatingNew ? (
                    <Box className={`${internalChatClassName}-content-placeholder`} width={'100%'} height={'100%'} align={'center'} WebkitJustifyContent={'center'} verticalAlign={'middle'}>
                        {permissions.includes("my-tickets-access-internal-chat") && <Text>Create a chat to start messaging</Text>}
                        {!permissions.includes("my-tickets-access-internal-chat") && <Text>You do not have permission to access internal chat.</Text>}
                    </Box>
                ) : isCreatingNew ? (
                    <CreateMail
                        internalChatClassName={internalChatClassName}
                        isSendingMessage={isSendingMessage}
                        addressBook={addressBook}
                        onCancelCreateNew={onCancelCreateNew}
                        onSendButtonClicked={onCreateNewSendButtonClicked}
                    />
                ) : (
                    <ViewMail
                        internalChatClassName={internalChatClassName}
                        isSendingMessage={isSendingMessage}
                        handleSendMessage={handleSendMessage}
                        agentId={agentId}
                        selectedItemId={selectedItem}
                        isFlagged={selectedItemData?.isFlagged ?? false}
                        onFlaggedClicked={handleFlagClick}
                        handleDeleteMail={handleDeleteMail}
                    />
                )}
            </Box>
        </Box>
    );
}

export default InternalChatWrapper;
