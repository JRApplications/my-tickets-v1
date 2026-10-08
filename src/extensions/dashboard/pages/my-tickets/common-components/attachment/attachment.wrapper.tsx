import { type FC } from 'react';

import { TextButton, Box, Text } from '@wix/design-system';
import {
    Page as PageSmallIcon
} from '@wix/wix-ui-icons-common/odeditor';
import './attachment.css';
import { ArrowTopRight as ArrowTopRightIcon, } from '@wix/wix-ui-icons-common/odeditor';

interface AttachmentWrapperProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
}

const AttachmentWrapper: FC<AttachmentWrapperProps> = ({ items }) => {
    return (
        <Box direction='vertical' gap={1} boxSizing='border-box'>
            {items && items.map(item => (
                <Box width='100%' gap={2} maxWidth='315px' boxSizing='border-box' verticalAlign='middle' WebkitJustifyContent='space-between' backgroundColor='white' padding='10px' borderRadius='4px'>
                    <Box verticalAlign='middle' gap={2} boxSizing='border-box'>
                        <Box>
                            <PageSmallIcon className='in-chat-file-icon' />
                        </Box>
                        <Box direction='vertical' maxWidth='200px'>
                            <Text weight='bold' ellipsis>{item.name}</Text>
                            <Text size='small'>Attachment</Text>
                        </Box>
                    </Box>
                    <Box>
                        <TextButton size='tiny' onClick={() => window.open(item.url, '_blank')} suffixIcon={<ArrowTopRightIcon />}>Open</TextButton>
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

export default AttachmentWrapper;