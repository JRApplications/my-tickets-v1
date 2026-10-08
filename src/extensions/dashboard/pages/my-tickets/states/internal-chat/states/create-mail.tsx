import { useState } from 'react';
import { Box, Button, Input, MultiSelect, Text, listItemSelectBuilder, Avatar, Card, Badge } from '@wix/design-system';
import MessageInput from '../../../common-components/message-input/message-input.route';
import './create-mail.css';

interface CreateMailProps {
    internalChatClassName: string;
    isSendingMessage: boolean;
    addressBook: Array<{ _id: string; name: string; email: string; agentId?: string; teamId?: string; isAgent: boolean; isTeam: boolean }>;
    onCancelCreateNew: () => void;
    onSendButtonClicked: (message: string, subject: string, attachments: Array<{ id: string; name: string; url: string }>, selectedAddresses: Array<{ _id: string; name: string; email: string; agentId?: string; teamId?: string; isAgent: boolean; isTeam: boolean }>) => Promise<boolean>;
}

const CreateMail: React.FC<CreateMailProps> = ({
    internalChatClassName,
    isSendingMessage,
    addressBook,
    onCancelCreateNew,
    onSendButtonClicked
}) => {
    const [attachmentFiles, setAttachmentFiles] = useState<Array<{ id: string; name: string; url: string }>>([]);
    const [messageInput, setMessageInputState] = useState<string>('');
    const [messageSubject, setMessageSubject] = useState<string>('');
    const [tags, setTags] = useState<Array<{ id: string; label: string; size: 'medium' }>>([]);
    const [hasFailedSend, setHasFailedSend] = useState(false);


    const handleOnSelect = (tag: any) => {
        setTags([...tags, tag]);
        setHasFailedSend(false);
    }

    const handleOnRemoveTag = (tagId: any) =>
        {
            setTags(tags.filter((currTag) => currTag.id !== tagId));
            setHasFailedSend(false);
        }

    const handleSendButtonClick = async () => {
        if (isSendingMessage) return;
        if (onSendButtonClicked) {
            const newSelectedAddresses = tags.map(tag => {
                const address = addressBook.find(addr => addr._id === tag.id);
                return address!;
            }).filter((addr): addr is typeof addressBook[number] => !!addr);
            const sent = await onSendButtonClicked(messageInput, messageSubject, attachmentFiles, newSelectedAddresses);
            setHasFailedSend(!sent);
        }
    };

    const formattedOptions = () => {
        return addressBook.map((address) =>
            listItemSelectBuilder({
                id: address._id,
                prefix: <Avatar size="size30" name={address.name} />,
                title: address.name,
                subtitle: address.email,
                // @ts-ignore
                suffix: <Badge type="outlined" skin="" size='small'>{address.isAgent ? 'Agent' : address.isTeam ? 'Team' : ''}</Badge>
            })
        );
    }

    return (
        <Box className={`${internalChatClassName}-content-messages`} gap={2} padding={'15px'} width={'100%'} height={'100%'} direction={'vertical'} maxHeight={'100%'} boxSizing={'border-box'}>
            <Card>
                <Card.Content>
                    <Box direction={'horizontal'} WebkitJustifyContent={'space-between'} align={'center'} gap={7}>
                        <Box direction={'horizontal'} width={'100%'}>
                            <Box direction={'vertical'} verticalAlign='middle' gap={2} width={'100%'}>
                                <Box verticalAlign='middle'>
                                    <Box minWidth='90px' maxWidth='90px'>
                                        <Text weight={'bold'}>To:</Text>
                                    </Box>
                                    <MultiSelect
                                        className={`${internalChatClassName}-to-multiselect`}
                                        size={'medium'}
                                        placeholder="Enter name or internal email"
                                        options={formattedOptions()}
                                        tags={tags}
                                        onSelect={handleOnSelect}
                                        onRemoveTag={handleOnRemoveTag}
                                    />
                                </Box>
                                <Box verticalAlign='middle' width={'100%'}>
                                    <Box minWidth='90px' maxWidth='90px'>
                                        <Text weight={'bold'}>Subject:</Text>
                                    </Box>
                                    <Input className={`subject-input`} placeholder="Enter subject" size={'medium'} value={messageSubject} onChange={(e) => { setMessageSubject(e.target.value); setHasFailedSend(false); }} />
                                </Box>
                            </Box>
                        </Box>

                        <Box gap={2} direction={'horizontal'} >
                            <Button priority={'secondary'} onClick={onCancelCreateNew}>Cancel</Button>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
            <Card hideOverflow stretchVertically>
                <Card.Content dataHook={'message-input-card'}>
                    <MessageInput
                        messageInput={messageInput}
                        setMessageInput={(value) => { setMessageInputState(value); setHasFailedSend(false); }}
                        ticketPermissions={['my-tickets-single-ticket-send-message']}
                        attachments={attachmentFiles}
                        setAttachments={(value) => { setAttachmentFiles(value); setHasFailedSend(false); }}
                        isInternalMail={true}
                        isSending={isSendingMessage}
                        hasFailedSend={hasFailedSend}
                        handleSendMessage={handleSendButtonClick}
                        placeholder="Start typing your message... Type @ to mention someone"
                        allowMentions={true}
                        getMentionApiUrl="/api/agents/getMentionList"
                    />
                </Card.Content>
            </Card>
        </Box>
    )
}

export default CreateMail;
