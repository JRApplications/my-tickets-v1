import { useState } from 'react';

import {
    loginUser,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
} from './login.api';

import type {
    ForgotPasswordStep,
    LoginSuccessData,
} from './login.types';

import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

interface UseLoginProps {
    onLoginSuccess: (data: LoginSuccessData) => void;
}

export const useLogin = ({
    onLoginSuccess,
}: UseLoginProps) => {
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loginError, setLoginError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [resetToken, setResetToken] = useState<string | null>(null);
    const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
        useState(false);

    const [inputValue, setInputValue] = useState('');
    const [forgotPasswordStep, setForgotPasswordStep] =
        useState<ForgotPasswordStep>('code');

    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [viewPassword, setViewPassword] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            setLoginError(false);

            const data = await loginUser({
                email,
                userId,
            }, rememberMe);

            onLoginSuccess(toLoginSuccessData(data));
        } catch (error: unknown) {
            setLoginError(true);

            const message =
                error instanceof Error
                    ? error.message
                    : 'Login failed';

            console.error(message);
            ShowToast({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        try {
            const data = await requestPasswordReset({ email });

            setResetToken(data.token);
            setIsForgotPasswordModalOpen(true);
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to send access code';

            console.error(message);
            ShowToast({ message, type: 'error' });
        }
    };

    const handleVerifyCode = async () => {
        try {
            await verifyResetCode({
                token: resetToken || '',
                code: inputValue,
            });

            setForgotPasswordStep('newPassword');
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Invalid access code';

            console.error(message);
            ShowToast({ message, type: 'error' });
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmNewPassword) {
            ShowToast({ message: 'Passwords do not match', type: 'error' });
            return;
        }

        if (newPassword.length < 6) {
            ShowToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        try {
            await resetPassword({
                token: resetToken || '',
                code: inputValue,
                newPassword,
            });

            const data = await loginUser({ email, userId: newPassword }, rememberMe);

            ShowToast({ message: 'Password reset successfully!', type: 'success' });

            closeForgotPasswordModal();
            onLoginSuccess(toLoginSuccessData(data));
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to reset password';

            console.error(message);
            ShowToast({ message, type: 'error' });
        }
    };

    const closeForgotPasswordModal = () => {
        setResetToken(null);
        setIsForgotPasswordModalOpen(false);
        setForgotPasswordStep('code');
        setInputValue('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    return {
        email,
        setEmail,

        userId,
        setUserId,
        rememberMe,
        setRememberMe,

        loginError,
        isLoading,

        resetToken,
        inputValue,
        setInputValue,

        isForgotPasswordModalOpen,
        forgotPasswordStep,

        newPassword,
        setNewPassword,

        confirmNewPassword,
        setConfirmNewPassword,

        viewPassword,
        setViewPassword,

        isHelpModalOpen,
        setIsHelpModalOpen,

        handleLogin,
        handleForgotPassword,
        handleVerifyCode,
        handleResetPassword,
        closeForgotPasswordModal,
    };
};

const toLoginSuccessData = (data: Awaited<ReturnType<typeof loginUser>>): LoginSuccessData => ({
    teamId: data.teamId,
    agentId: data.agentId,
    permissions: data.permissions,
    authToken: data.authToken,
    name: data.name,
    roleId: data.roleId,
    roleName: data.roleName,
    teamName: data.teamName,
    agentProfilePictureUrl: data.agentProfilePictureUrl,
});
