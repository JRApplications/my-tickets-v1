import { extensions } from '@wix/astro/builders';

export default extensions.genericExtension({
    compId: '137141d8-db03-498f-911a-080fce7e7e2b',
    compName: 'Reset Password Request',
    compType: 'NOTIFICATION_TOPIC',
    compData: {
        "notificationTopic": {
            "description": "Sent to the site contributors for the user to login",
            "multilocationSupported": false,
            "state": "DEFAULT_ON",
            "supportedRecipientTypes": [],
            "type": "TRANSACTIONAL"
        }
    },
})