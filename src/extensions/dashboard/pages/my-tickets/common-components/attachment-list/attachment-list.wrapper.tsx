import { type FC, useState, useEffect } from 'react';

import { IconButton, Box, Text } from '@wix/design-system';
import {
    Page as PageSmallIcon,
    DismissSmall as DismissIcon
} from '@wix/wix-ui-icons-common/odeditor';
import './attachment-list.css';

interface AttachmentListWrapperProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
    onRemove?: (id: string) => void;
    onClick?: (id: string, url: string) => void;
}

const AttachmentListWrapper: FC<AttachmentListWrapperProps> = ({ items, onRemove, onClick }) => {
    const [localItems, setLocalItems] = useState(items);

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const handleOnRemove = (id: string) => {
        if (onRemove) {
            onRemove(id);
        }
        setLocalItems(prev => prev.filter(item => item.id !== id));
    }

    return (
        <Box paddingBottom={2} direction='horizontal' gap={2} maxWidth='100%' overflowY='scroll' boxSizing='border-box'>
            {localItems.map(item => (
                <div className='file-item-container' key={item.id} onClick={() => onClick && onClick(item.id, item.url)}>
                    <Box>
                        <PageSmallIcon />
                    </Box>
                    <Text size='small' ellipsis>{item.name}</Text>
                    <Box>
                        <IconButton skin="light" size='tiny' onClick={() => handleOnRemove(item.id)}><DismissIcon /></IconButton>
                    </Box>
                </div>
            ))}
        </Box>
    );
}

export default AttachmentListWrapper;