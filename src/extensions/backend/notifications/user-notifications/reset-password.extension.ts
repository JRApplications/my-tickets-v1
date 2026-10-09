import { extensions } from '@wix/astro/builders';

export default extensions.genericExtension({
    compId: '3822a493-cb3d-4933-aa79-c516026d5867',
    compName: 'User ID Reset Code Notification',
    compType: 'USER_NOTIFICATION',
    compData: {
        "userNotification": {
            "referenceData": {
                "description": "Sent to the site owner for the user to login",
                "topicId": "137141d8-db03-498f-911a-080fce7e7e2b",
                "channels": {
                    "feed": {
                        "webFeed": {
                            "contentKeys": {
                                "title": "Title",
                                "message": "Message",
                                "action": ""
                            }
                        },
                        "mobileFeed": {
                            "contentKeys": {
                                "title": "Title",
                                "message": "Message",
                                "action": ""
                            }
                        }
                    },
                    "mobilePush": {
                        "config": {
                            "shared": {
                                "sound": "general.wav",
                                "groupKey": "{{site}}",
                                "targetApplication": "NO_SPECIFIC_TARGET_APP"
                            }
                        },
                        "contentKeys": {
                            "title": "Title",
                            "message": "Message"
                        }
                    },
                    "contentMap": {
                        "Title": "{{UserName}} has requested to regain access",
                        "Message": "Code: {{AccessCode}}. Do not share this code with anyone! If you did not expect this code please contact your My Tickets administrator. "
                    }
                },
                "icon": {
                    "type": "SPOUT"
                },
                "intent": "MARKETING",
                "recipientFilter": {
                    "type": "SITE_CONTRIBUTORS",
                    "siteContributorsData": {
                        "permissions": [
                            "PING.ALL_CONTRIBUTORS_NOTIFICATIONS_RECEIVE"
                        ]
                    }
                },
                "initiator": {
                    "type": "WIX_APP"
                },
                "singleDeeplink": {
                    "backoffice": {
                        "appId": "bbc0bfe8-5b30-405a-b400-71cfe51f8ad5",
                        "params": {}
                    }
                },
                "context": {
                    "level": "SITE",
                    "params": {}
                },
                "type": "REGULAR"
            }
        }
    }
})