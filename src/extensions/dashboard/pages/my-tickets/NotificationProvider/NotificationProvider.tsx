import React from 'react';
import { Notification } from '@wix/design-system';

interface NotificationProviderProps {
    notificationMessage: string;
    isShown: boolean;
}

const NotificationProvider = ({ notificationMessage, isShown }: NotificationProviderProps) => {
    return (
        <Notification show={isShown} type='sticky' zIndex={9999}>
            <Notification.TextLabel>{notificationMessage}</Notification.TextLabel>
            <Notification.CloseButton />
        </Notification>
    );
};

export default NotificationProvider;