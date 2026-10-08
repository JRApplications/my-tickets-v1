export interface LoginSuccessData {
    teamId: string;
    agentId: string;
    permissions: string[];
    authToken: string;
    name: string;
    roleId: string;
    roleName: string;
    teamName: string;
    agentProfilePictureUrl: string;
}

export interface LoginPageProps {
    handleLoginSuccess: (data: LoginSuccessData) => void;
    isGettingReady: boolean;
}

export interface LoginWrapperProps {
    onLoginSuccess: (data: LoginSuccessData) => void;
    isGettingReady: boolean;
}

export interface FeatureCheckProps {
    text: string;
}

export type ForgotPasswordStep = 'code' | 'newPassword';
