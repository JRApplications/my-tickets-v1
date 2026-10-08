import { type FC } from 'react';

import { TextButton, Box } from '@wix/design-system';
import {
    Page as PageSmallIcon
} from '@wix/wix-ui-icons-common/odeditor';
import './attachment.css';
import { ArrowTopRight as ArrowTopRightIcon, } from '@wix/wix-ui-icons-common/odeditor';

interface AttachmentWrapperProps {
    item: {
        id: string;
        name: string;
        url: string;
    };
}

const AttachmentWrapper: FC<AttachmentWrapperProps> = ({ item }) => {
    return (
        <Box direction='horizontal' maxWidth='100%' boxSizing='border-box' className='in-chat-file-attachment-wrapper-box'>
            {item && (
                <div className='in-chat-file-item-container' key={item.id}>
                    <PageSmallIcon className='in-chat-file-icon' />
                    <div className='in-chat-file-names-container'>
                    <span className='in-chat-file-name'>{item.name}</span>
                    <span className='in-chat-file-sub-name'>Attachment</span>
                    </div>
                    <TextButton size='tiny' onClick={() => window.open(item.url, '_blank')} suffixIcon={<ArrowTopRightIcon />}>Open</TextButton>
                </div>
            )}
        </Box>
    );
}

export default AttachmentWrapper;