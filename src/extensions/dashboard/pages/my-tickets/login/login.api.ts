import { httpClient } from '@wix/essentials';
import { storeMyTicketsAgentSession } from '../auth/myTicketsFetchWithAuth';

const baseApiUrl = new URL(import.meta.url).origin;

export interface LoginRequest {
    email: string;
    userId: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    error?: string;
    teamId: string;
    agentId: string;
    permissions: string[];
    authToken: string;
    authTokenExpiresAt: number;
    name: string;
    roleId: string;
    roleName: string;
    teamName: string;
    agentProfilePictureUrl: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message?: string;
    token: string;
}

export interface VerifyResetCodeRequest {
    token: string;
    code: string;
}

export interface VerifyResetCodeResponse {
    success: boolean;
    message?: string;
    error?: string;
    user: {
        teamId: string;
        agentId: string;
        permissions: string[];
    };
}

export interface ResetPasswordRequest {
    token: string;
    code: string;
    newPassword: string;
}

export const loginUser = async (
    request: LoginRequest,
    rememberMe = false,
): Promise<LoginResponse> => {
    const response = await httpClient.fetchWithAuth(
        `${baseApiUrl}/api/auth/loginv1`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        }
    );

    const data: LoginResponse = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Login failed');
    }

    if (data.authToken) {
        sessionStorage.removeItem('my-tickets-agent-profile');
        storeMyTicketsAgentSession(data.authToken, data.authTokenExpiresAt, rememberMe);
    }

    return data;
};

export const requestPasswordReset = async (
    request: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> => {
    const response = await httpClient.fetchWithAuth(
        `${baseApiUrl}/api/auth/forgot-password`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        }
    );

    const data: ForgotPasswordResponse = await response.json();

    if (!data.success) {
        throw new Error('Failed to send access code');
    }

    return data;
};

export const verifyResetCode = async (
    request: VerifyResetCodeRequest
): Promise<VerifyResetCodeResponse> => {
    const response = await httpClient.fetchWithAuth(
        `${baseApiUrl}/api/auth/verify-reset-code`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        }
    );

    const data: VerifyResetCodeResponse = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Invalid access code');
    }

    return data;
};

export const resetPassword = async (
    request: ResetPasswordRequest
): Promise<VerifyResetCodeResponse> => {
    const response = await httpClient.fetchWithAuth(
        `${baseApiUrl}/api/auth/reset-password`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        }
    );

    const data: VerifyResetCodeResponse = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to reset password');
    }

    return data;
};
