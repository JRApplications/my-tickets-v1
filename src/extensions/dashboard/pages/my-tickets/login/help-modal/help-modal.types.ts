export interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface AppInstance {
    appVersion?: string;
    instanceId?: string;
    freeTrialAvailable?: boolean;
}

export interface SiteInfo {
    siteId?: string;
    installedWixApps?: string[];
    ownerInfo?: {
        email?: string;
    };
}

export interface HelpModalDetails {
    instance?: AppInstance;
    site?: SiteInfo;
}

export interface HelpModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    details: HelpModalDetails;
}
