import { type FC, useEffect, useRef } from 'react';
import { useState } from 'react';
import * as Icons from '@wix/wix-ui-icons-common';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import './message-input.css';
import { Button, Box, IconButton, InputShell, SkeletonRectangle, Loader, Text } from '@wix/design-system';
import {
    Send as SendIcon,
} from '@wix/wix-ui-icons-common/odeditor';
import AttachmentList from '../attachment-list/attachment-list.route';
import { dashboard } from '@wix/dashboard';
import { MentionEditor } from './MentionEditor';
import { uploadAttachment } from './uploadAttachment';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_MESSAGE, resolveAttachmentMimeType } from '@jrapps/my_tickets_common_types';

interface MessageInputWrapperProps {
    placeholder?: string;
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage?: () => void;
    isSending: boolean;
    ticketPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
    hideSendButton?: boolean;
    isInternalMail?: boolean;
    allowMentions?: boolean;
    getMentionApiUrl?: string;
    disabled?: boolean;
    isLoading?: boolean;
    hasFailedSend?: boolean;
}

const MessageInputWrapper: FC<MessageInputWrapperProps> = ({
    messageInput,
    placeholder = '',
    setMessageInput,
    handleSendMessage,
    isSending,
    ticketPermissions,
    attachments,
    setAttachments,
    hideSendButton = false,
    isInternalMail,
    allowMentions = true,
    getMentionApiUrl,
    disabled = false,
    isLoading = false,
    hasFailedSend = false,
}) => {
    const [agents, setAgents] = useState<Array<{ id: string; name: string; teamName: string; teamId: string }>>([]);
    const [uploadingNames, setUploadingNames] = useState<Array<{ tempId: string; name: string }>>([]);
    const isUploading = uploadingNames.length > 0;
    const canSend = ticketPermissions.includes('my-tickets-single-ticket-send-message');
    const canAcceptFiles = !disabled && canSend && !isLoading;
    const [isDragging, setIsDragging] = useState(false);
    const dragDepthRef = useRef(0);

    const getRemainingSlots = () => MAX_ATTACHMENTS_PER_MESSAGE - attachments.length - uploadingNames.length;

    const showCapToast = () => {
        dashboard.showToast({ message: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`, type: 'error' });
    };

    const handleFilesAdded = (files: File[], renameAsScreenshot = false) => {
        if (!canAcceptFiles) {
            return;
        }

        const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        let remainingSlots = getRemainingSlots();
        let hitCap = false;

        files.forEach(async (file, index) => {
            const extension = file.type.split('/')[1] ?? 'png';
            const name = renameAsScreenshot
                ? `screenshot-${stamp}${files.length > 1 ? `-${index + 1}` : ''}.${extension}`
                : file.name;

            if (!resolveAttachmentMimeType(name)) {
                dashboard.showToast({ message: `"${name}" is not a supported file type.`, type: 'error' });
                return;
            }
            if (file.size > MAX_ATTACHMENT_BYTES) {
                dashboard.showToast({ message: `"${name}" is larger than 10 MB.`, type: 'error' });
                return;
            }
            if (remainingSlots <= 0) {
                hitCap = true;
                return;
            }
            remainingSlots -= 1;

            const tempId = `${name}-${Date.now()}-${index}`;
            setUploadingNames((prev) => [...prev, { tempId, name }]);
            try {
                const uploaded = await uploadAttachment(new File([file], name, { type: file.type }));
                setAttachments((prev) => [...prev, uploaded]);
            } catch (error) {
                console.error('Error uploading attachment:', error);
                dashboard.showToast({ message: error instanceof Error ? error.message : `Failed to upload "${name}".`, type: 'error' });
            } finally {
                setUploadingNames((prev) => prev.filter((item) => item.tempId !== tempId));
            }
        });

        if (hitCap) {
            showCapToast();
        }
    };

    const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes('Files');

    const handleDragEnter = (event: React.DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        if (!canAcceptFiles) return;
        dragDepthRef.current += 1;
        setIsDragging(true);
    };

    const handleDragOver = (event: React.DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = canAcceptFiles ? 'copy' : 'none';
    };

    const handleDragLeave = (event: React.DragEvent) => {
        if (!hasFiles(event) || !canAcceptFiles) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (event: React.DragEvent) => {
        if (!hasFiles(event)) return;
        // Stops the browser from opening the file or inserting it into the editor.
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        handleFilesAdded(Array.from(event.dataTransfer.files));
    };

    const handleOpenMediaManager = () => {
        dashboard.openMediaManager({ multiSelect: true }).then((response) => {
            if (response?.items) {
                const newAttachments: Array<{ id: string; name: string; url: string }> = response.items.map((item) => ({
                    id: item._id ?? '',
                    name: item.displayName ?? '',
                    url: item.url ?? ''
                }));
                const accepted = newAttachments.slice(0, Math.max(0, getRemainingSlots()));
                if (accepted.length < newAttachments.length) {
                    showCapToast();
                }
                setAttachments((prev) => [...prev, ...accepted]);
            }
        }).catch((error) => {
            console.error('Error opening media manager:', error);
        });
    }

    useEffect(() => {
        if (!getMentionApiUrl || !allowMentions) {
            return;
        }

        const fetchAgents = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}${getMentionApiUrl}`);
                const data = await response.json();
                if (data.success) {
                    setAgents(data.agents ?? []);
                } else {
                    setAgents([]);
                }
            } catch (error) {
                console.error('Error fetching agents via mentions API:', error);
                setAgents([]);
            }
        }

        fetchAgents();
    }, [getMentionApiUrl, allowMentions]);

    return (
        <Box className='message-input-wrapper-container' direction='vertical'>
            <div
                className="input-area-wrapper"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="message-input-drop-overlay">
                        <Text weight='bold'>Drop files to attach</Text>
                    </div>
                )}
                <Box width='100%' align='center' verticalAlign='middle' height={isInternalMail ? '100%' : undefined}>
                    {!isLoading && (
                        <InputShell dataHook={isInternalMail ? 'internal-mail-input-shell' : 'input-shell'}>
                            <Box direction='vertical' height='100%' width='100%' className='text-area-shell'>

                                <AttachmentList items={attachments} />
                                {isUploading && (
                                    <Box paddingBottom={2} direction='horizontal' gap={2}>
                                        {uploadingNames.map((item) => (
                                            <div className='file-item-container' key={item.tempId}>
                                                <Loader size='tiny' />
                                                <Text size='small' ellipsis>{item.name}</Text>
                                            </div>
                                        ))}
                                    </Box>
                                )}
                                <MentionEditor
                                    allowMentions={allowMentions}
                                    placeholder={placeholder}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e)}
                                    isLoading={false}
                                    isError={false}
                                    disabled={!ticketPermissions.includes('my-tickets-single-ticket-send-message') || disabled}
                                    spellCheck={true}
                                    agents={agents}
                                    onImagesPasted={(files) => handleFilesAdded(files, true)}
                                />
                                <Box width='100%' WebkitJustifyContent='space-between'>
                                    <Box>
                                        <IconButton size='small' onClick={handleOpenMediaManager} disabled={disabled || !ticketPermissions.includes('my-tickets-single-ticket-send-message')}>
                                            <Icons.Attachment />
                                        </IconButton>
                                    </Box>
                                    {!hideSendButton && (
                                        <Box direction="horizontal" verticalAlign="middle" gap={2}>
                                            <Button
                                                size='small'
                                                prefixIcon={<SendIcon />}
                                                onClick={handleSendMessage}
                                                disabled={!ticketPermissions.includes('my-tickets-single-ticket-send-message') || disabled || isSending || isUploading}
                                                skin={hasFailedSend ? 'destructive' : undefined}
                                            >
                                                {isSending ? <Loader size='tiny' /> : hasFailedSend ? 'Retry' : 'Send'}
                                            </Button>
                                            {hasFailedSend && <Text size="tiny" skin="error">Sending failed</Text>}
                                        </Box>
                                    )}
                                </Box>

                            </Box>
                        </InputShell>
                    )}

                    {isLoading && (
                        <Box className='message-input-loading' direction='vertical' width='100%'>
                            <SkeletonRectangle width="100%" height="100px" />
                        </Box>
                    )}
                </Box>
            </div>

        </Box>
    );
}

export default MessageInputWrapper;
