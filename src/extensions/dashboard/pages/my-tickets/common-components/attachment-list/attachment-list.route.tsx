import { type FC } from 'react';

import AttachmentListWrapper from './attachment-list.wrapper';

interface AttachmentListProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
}

const AttachmentList: FC<AttachmentListProps> = ({ items }) => {
    return (
        <AttachmentListWrapper items={items} />
    )
}

export default AttachmentList;