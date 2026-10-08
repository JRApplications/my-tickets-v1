import InternalChatWrapper from './internal-chat-wrapper';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { useState, useEffect } from 'react';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { dashboard } from '@wix/dashboard';
import { subscriber } from '@wix/realtime';

interface InternalChatProps {
    teamId: string;
    agentId: string;
    permissions: any;
    onAiButtonClicked: () => void;
}

const InternalChat = ({
    teamId,
    agentId,
    permissions,
    onAiButtonClicked
}: InternalChatProps) => {
    const [selectedItem, setSelectedItem] = useState<string | null>('');
    const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
    const [addressBook, setAddressBook] = useState<Array<{ _id: string; name: string; email: string; agentId?: string; teamId?: string; isAgent: boolean; isTeam: boolean }>>([]);
    const [sidebarItems, setSidebarItems] = useState<Array<{ _id: string; from: string; to: string[]; hasRead: boolean; isFlagged: boolean; originalSent: boolean; isDeleted: boolean; subject: string, timestamp: any }>>([]);
    const [allMailNumber, setAllMailNumber] = useState<number>(0);
    const [unreadMailNumber, setUnreadMailNumber] = useState<number>(0);
    const [flaggedMailNumber, setFlaggedMailNumber] = useState<number>(0);
    const [isSidebarLoading, setIsSidebarLoading] = useState<boolean>(true);
    const [isSidebarError, setIsSidebarError] = useState<boolean>(false);
    const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

    useEffect(() => {
        dashboard.setPageTitle(`Internal Mail ${unreadMailNumber > 0 ? `(${unreadMailNumber})` : ''}`);
    }, [unreadMailNumber]);

    // inserts a mail the sidebar doesn't have yet, otherwise updates it in place, keeping counts in sync either way
    const applyRealtimeMailUpdate = (updatedItem: any) => {
        setSidebarItems(prev => {
            const existingIndex = prev.findIndex(item => item._id === updatedItem._id);
            if (existingIndex === -1) {
                setAllMailNumber(n => n + 1);
                if (!updatedItem.hasRead) setUnreadMailNumber(n => n + 1);
                if (updatedItem.isFlagged) setFlaggedMailNumber(n => n + 1);
                return [updatedItem, ...prev];
            }
            const existing = prev[existingIndex];
            if (existing.hasRead !== updatedItem.hasRead) {
                setUnreadMailNumber(n => updatedItem.hasRead ? n - 1 : n + 1);
            }
            if (existing.isFlagged !== updatedItem.isFlagged) {
                setFlaggedMailNumber(n => updatedItem.isFlagged ? n + 1 : n - 1);
            }
            const next = [...prev];
            next[existingIndex] = { ...existing, ...updatedItem };
            return next;
        });
    };

    useEffect(() => {

        const channel = { name: 'INTERNAL_MAIL', resourceId: teamId };
        subscriber.subscribe(
            channel,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'INTERNAL_MAIL' && channelResourceId === teamId) {
                    let payload = message.payload;
                    const mailId = payload.mailId;
                    const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/internal-mail/getMailSidebarMetaData?mailId=${mailId}&agentId=${agentId}`);
                    if (!response.ok) {
                        console.error('Failed to fetch updated mail item:', response.statusText);
                        ShowToast({ message: 'Failed to fetch updated mail item. Please try again.', type: 'error' });
                        return;
                    }
                    const data = await response.json();
                    const updatedItem = data.item;
                    applyRealtimeMailUpdate(updatedItem);
                }
            },
            {
                onSubscribed: () => console.log('Internal Mail team Subscribed'),
                onSubscriptionError: (error) => { console.error('Error', error); ShowToast({ message: 'Failed to subscribe to internal team mail messages. Please try again.', type: 'error' }); },
            }
        );

        const channel1 = { name: 'INTERNAL_MAIL', resourceId: agentId };
        subscriber.subscribe(
            channel1,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'INTERNAL_MAIL' && channelResourceId === agentId) {
                    let payload = message.payload;
                    const mailId = payload.mailId;
                    const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/internal-mail/getMailSidebarMetaData?mailId=${mailId}&agentId=${agentId}`);
                    const data = await response.json();
                    if (!response.ok) {
                        console.error(data.error);
                        ShowToast({ message: data.error, type: 'error' });
                        return;
                    }
                    const updatedItem = data.item;
                    applyRealtimeMailUpdate(updatedItem);

                }
            },
            {
                onSubscribed: () => console.log('Internal Mail agent Subscribed'),
                onSubscriptionError: (error) => { console.error('Error', error); ShowToast({ message: 'Failed to subscribe to internal agent mail messages. Please try again.', type: 'error' }); },
            }
        );

        fetchAddressBook();
        fetchSidebarItems();

        return () => {
            subscriber.unsubscribe({ channel });
            subscriber.unsubscribe({ channel: channel1 });
        };
    }, []);

    const handleSendMessage = async (item: any): Promise<{ success: boolean; updatedConversation?: any }> => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            const data = await response.json();
            if (!response.ok) {
                console.error(data.error)
                ShowToast({ message: data.error, type: 'error' });
                return { success: false };
            }
            return { success: true, updatedConversation: data.updatedConversation };
        } catch (error: any) {
            console.error(error.message);
            ShowToast({ message: error.message, type: 'error' });
            return { success: false };
        }
    }

    const handleNewButtonClick = () => {
        setIsCreatingNew(true);
        setSelectedItem(null);
    }

    const handleCancelCreateNew = () => {
        setIsCreatingNew(false);
        setSelectedItem(null);
    }

    const fetchAddressBook = async () => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/getAddressBook`);
            if (!response.ok) {
                throw new Error(`Error fetching address book: ${response.statusText}`);
            }
            const data = await response.json();
            setAddressBook(data);
        } catch (error: any) {
            console.error(error.message)
            ShowToast({ message: error.message, type: 'error' });
        }
    };

    const handleOnFlaggedClicked = async ({ isRemoving, isAdding, agentId, mailId }: any) => {
        try {
            const updatedSidebar = sidebarItems.map(item => item._id === mailId ? { ...item, isFlagged: isAdding } : item);
            setSidebarItems(updatedSidebar);
            setFlaggedMailNumber(prev => isAdding ? prev + 1 : prev - 1);
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/updateFlaggedStatus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRemoving, isAdding, agentId, mailId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                // Use functional updater to avoid stale closure on rollback
                setSidebarItems(prev => prev.map(item => item._id === mailId ? { ...item, isFlagged: !isAdding } : item));
                setFlaggedMailNumber(prev => isAdding ? prev - 1 : prev + 1);
                ShowToast({ message: errorData.error, type: 'error' });
                console.error('Error updating flagged status:', errorData.error || 'Failed to update flagged status');
            }
        } catch (error: any) {
            console.error(error.message)
            ShowToast({ message: error.message, type: 'error' });
        }
    }

    const fetchSidebarItems = async () => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/getAllMail?agentId=${agentId}&teamId=${teamId}`);
            if (!response.ok) {
                throw new Error(`Error fetching sidebar items: ${response.statusText}`);
            }
            const data = await response.json();
            setSidebarItems(data.items);
            setIsSidebarLoading(false);
            setAllMailNumber(data.allMailCount);
            setUnreadMailNumber(data.unreadMailCount);
            setFlaggedMailNumber(data.flaggedMailCount);
        } catch (error: any) {
            console.error(error.message)
            ShowToast({ message: error.message, type: 'error' });
            setIsSidebarError(true);
        } finally {
            setIsSidebarLoading(false);
        }
    }

    const handleCreateNewMail = async (message: string, subject: string, attachments: any[], selectedAddresses: any[]): Promise<boolean> => {
        if (isSendingMessage) return false;
        setIsSendingMessage(true);

        try {
            const agentsTo = selectedAddresses.filter(address => address.isAgent === true).map(a => a._id);
            const teamsTo = selectedAddresses.filter(address => address.isTeam === true).map(t => t._id);

            const bodyToSend = {
                message,
                subject,
                attachments,
                agentsTo,
                teamsTo,
                agentId
            }

            const baseApiUrl = new URL(import.meta.url).origin
            const request = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/createMail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend)
            });

            const response = await request.json()
            if (request.ok) {
                setAllMailNumber(prev => prev + 1);
                ShowToast({ message: 'Mail sent successfully!', type: 'success' });
                setIsCreatingNew(false);
                return true;
            } else {
                console.error(response.error)
                ShowToast({ message: response.error, type: 'error' });
                return false;
            }
        } catch (error: any) {
            console.error(error);
            ShowToast({ message: error.message || 'Failed to send mail. Please try again.', type: 'error' });
            return false;
        } finally {
            setIsSendingMessage(false);
        }
    }

    const handleOnSelectItem = async (item: any) => {
        if (item.hasRead === false) {
            const baseApiUrl = new URL(import.meta.url).origin
            await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/markAsRead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mailId: item._id, agentId })
            }).then(async (response) => {
                setUnreadMailNumber(prev => prev - 1);
                if (!response.ok) {
                    const errorData = await response.json();
                    setUnreadMailNumber(prev => prev + 1);
                    throw new Error(errorData.error);
                }
                const updatedSidebarItems = sidebarItems.map((sidebarItem) => {
                    if (sidebarItem._id === item._id) {
                        return { ...sidebarItem, hasRead: true };
                    }
                    return sidebarItem;
                });
                setSidebarItems(updatedSidebarItems);
            }).catch((error: any) => {
                console.error(error.message)
                ShowToast({ message: error.message, type: 'error' });
            });
        }
        setSelectedItem(item._id);
        setIsCreatingNew(false);
    }

    const handleDeleteMail = async (mailId: string) => {
        const baseApiUrl = new URL(import.meta.url).origin;
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/deleteMail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mailId, agentId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            setSidebarItems(prev => prev.filter(item => item._id !== mailId));
            setAllMailNumber(prev => prev - 1);
            setSelectedItem(null);
            ShowToast({ message: 'Mail deleted successfully', type: 'success' });

        } catch (error: any) {
            console.error(error.message);
            ShowToast({ message: error.message, type: 'error' });
        }
    }

    return (
        <InternalChatWrapper
            onSelectItem={handleOnSelectItem}
            handleFlaggedClicked={handleOnFlaggedClicked}
            selectedItem={selectedItem}
            items={sidebarItems}
            isSendingMessage={isSendingMessage}
            handleSendMessage={handleSendMessage}
            agentId={agentId}
            isCreatingNew={isCreatingNew}
            onNewButtonClick={handleNewButtonClick}
            addressBook={addressBook}
            onCancelCreateNew={handleCancelCreateNew}
            onCreateNewSendButtonClicked={handleCreateNewMail}
            allMailNumber={allMailNumber}
            unreadMailNumber={unreadMailNumber}
            flaggedMailNumber={flaggedMailNumber}
            isSidebarLoading={isSidebarLoading}
            isSidebarError={isSidebarError}
            onAiButtonClicked={onAiButtonClicked}
            permissions={permissions}
            handleDeleteMail={handleDeleteMail}
        />
    );
}

export default InternalChat;
