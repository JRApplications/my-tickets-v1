import { type FC } from 'react';

import AttachmentWrapper from './attachment.wrapper';

interface AttachmentProps {
    item: {
        id: string;
        name: string;
        url: string;
    };
}

const Attachment: FC<AttachmentProps> = ({ item }) => {
    return (
        <AttachmentWrapper item={item} />
    )
}

export default Attachment;