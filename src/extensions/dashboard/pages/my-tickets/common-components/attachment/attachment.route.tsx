import { type FC } from 'react';

import AttachmentWrapper from './attachment.wrapper';

interface AttachmentProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
}

const Attachment: FC<AttachmentProps> = ({ items }) => {
    return (
        <AttachmentWrapper items={items} />
    )
}

export default Attachment;