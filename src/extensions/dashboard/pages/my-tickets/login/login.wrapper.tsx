import type { FC } from 'react';

import {
    Box,
    Text,
    Input,
    Button,
    TextButton,
    Loader,
    CustomModalLayout,
    Modal,
    FormField,
    IconButton,
    Heading,
    Card,
    Checkbox,
    Tooltip
} from '@wix/design-system';

import {
    Email as EmailIcon,
    LockLocked,
    Hidden,
    Visible,
    InfoCircle,
} from '@wix/wix-ui-icons-common/odeditor';

import { useLogin } from './login.use';
import type {
    FeatureCheckProps,
    LoginWrapperProps,
} from './login.types';

import HelpModal from './help-modal/help-modal.route';

import './login.css';

const featuresList: FeatureCheckProps[] = [
    {
        text: 'Live chat & AI-powered intelligent ticket routing',
    },
    {
        text: 'Real-time team collaboration & internal notes',
    },
    {
        text: 'Multi-channel customer engagement',
    },
    {
        text: 'Scalable team management with granular permission control',
    },
];

const FeatureCheck: FC<FeatureCheckProps> = ({ text }) => {
    return (
        <div className="feature-check-container">
            <div className="feature-check">
                <svg
                    width="10"
                    height="10"
                    viewBox="0 0 8 8"
                    fill="none"
                >
                    <path
                        d="M1.5 4l2 2L6.5 2"
                        stroke="#1bd198"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            <p className="feature-check-text">
                {text}
            </p>
        </div>
    );
};

const LoginWrapper: FC<LoginWrapperProps> = ({
    onLoginSuccess,
    isGettingReady,
}) => {
    const {
        email,
        setEmail,
        userId,
        setUserId,
        rememberMe,
        setRememberMe,

        loginError,
        isLoading,

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
    } = useLogin({
        onLoginSuccess,
    });

    const currentUrl = new URL(import.meta.url);

    return (
        <Box
            className="login-page"
            align="center"
            verticalAlign="middle"
        >
            <Card hideOverflow dataHook='login-container-card'>
                <Card.Content dataHook='login-container-card-content'>
                    <Box
                        className="login-container"
                        direction="horizontal"
                    >
                        <Box
                            className="cell"
                            verticalAlign="middle"
                            direction="vertical"
                            gap="SP2"
                        >
                            {isGettingReady ? (
                                <Box
                                    width="100%"
                                    height="100%"
                                    align="center"
                                    WebkitJustifyContent="center"
                                    verticalAlign="middle"
                                >
                                    <Loader
                                        status="loading"
                                        size="medium"
                                        text={
                                            <Text size="medium">
                                                Getting things ready...
                                            </Text>
                                        }
                                    />
                                </Box>
                            ) : (
                                <>
                                    <Box
                                        direction="vertical"
                                        gap={2}
                                        paddingBottom="40px"
                                    >
                                        <Heading size='extraLarge'>
                                            Welcome back
                                        </Heading>
                                        <Heading size='large'>
                                            Sign in to your account to continue
                                        </Heading>
                                    </Box>

                                    <Box
                                        gap={3}
                                        direction="vertical"
                                    >
                                        <Input
                                            size="large"
                                            prefix={
                                                <Box verticalAlign="middle">
                                                    <EmailIcon />
                                                </Box>
                                            }
                                            placeholder="Email"
                                            type="email"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                        />

                                        <Input
                                            onEnterPressed={handleLogin}
                                            size="large"
                                            prefix={
                                                <Box verticalAlign="middle">
                                                    <LockLocked />
                                                </Box>
                                            }
                                            suffix={
                                                <Box verticalAlign="middle">
                                                    <IconButton
                                                        onClick={() =>
                                                            setViewPassword(
                                                                !viewPassword
                                                            )
                                                        }
                                                        skin="standard"
                                                        priority="tertiary"
                                                    >
                                                        {!viewPassword ? (
                                                            <Hidden />
                                                        ) : (
                                                            <Visible />
                                                        )}
                                                    </IconButton>
                                                </Box>
                                            }
                                            placeholder="User ID"
                                            type={
                                                viewPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={userId}
                                            onChange={(e) =>
                                                setUserId(e.target.value)
                                            }
                                        />
                                    </Box>

                                    <Box
                                        width='100%'
                                        WebkitJustifyContent='space-between'
                                        paddingTop="10px"
                                        paddingBottom="10px"

                                    >
                                        <Checkbox
                                            size='medium'
                                            checked={rememberMe}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                                            disabled={!email}
                                        >
                                            Remember me
                                        </Checkbox>

                                        <TextButton
                                            onClick={handleForgotPassword}
                                            disabled={!email}
                                        >
                                            Forgot Password?
                                        </TextButton>
                                    </Box>
                                    
                                    <Button
                                        size="large"
                                        appearance="primary"
                                        onClick={handleLogin}
                                    >
                                        {isLoading ? (
                                            <Loader
                                                status="loading"
                                                size="tiny"
                                            />
                                        ) : (
                                            'Log In'
                                        )}
                                    </Button>

                                    {loginError && (
                                        <Text className="error-text">
                                            Login failed. Please check and try again.
                                        </Text>
                                    )}
                                </>
                            )}
                        </Box>

                        <Box
                            className="cell1"
                            direction="vertical"
                        >
                            <div className="right-bg-circle c1" />

                            <img
                                width="75%"
                                src={currentUrl.origin + '/login-logo.svg'}
                                alt="My Tickets Logo"
                                className="login-logo"
                            />

                            <h4 className="login-description">
                                Exceptional support, delivered at scale.
                            </h4>

                            <h6 className="login-description-h6">
                                Powerful tools to manage, prioritise, and resolve
                                customer requests — with real-time analytics and
                                seamless team collaboration.
                            </h6>

                            {featuresList.map((feature) => (
                                <FeatureCheck
                                    key={feature.text}
                                    {...feature}
                                />
                            ))}

                            <div className="right-bg-circle c2" />
                        </Box>
                    </Box>
                </Card.Content>
            </Card>

            <Modal isOpen={isForgotPasswordModalOpen}>
                <CustomModalLayout
                    primaryButtonText={
                        forgotPasswordStep === 'code'
                            ? 'Next'
                            : 'Set Password'
                    }
                    primaryButtonOnClick={
                        forgotPasswordStep === 'code'
                            ? handleVerifyCode
                            : handleResetPassword
                    }
                    closeButtonProps={{
                        onClick: closeForgotPasswordModal,
                    }}
                    title={
                        forgotPasswordStep === 'code'
                            ? 'Forgot Password'
                            : 'Set New Password'
                    }
                    subtitle={
                        forgotPasswordStep === 'code'
                            ? 'Contact your administrator to retrieve your access code.'
                            : 'Enter and confirm your new password.'
                    }
                    footnote={
                        <Text>
                            Powered by{' '}
                            <Text weight="bold">
                                My Tickets
                            </Text>
                        </Text>
                    }
                    content={
                        forgotPasswordStep === 'code' ? (
                            <Box width="stretch">
                                <FormField label="Access Code">
                                    <Input
                                        className="code-input"
                                        value={inputValue}
                                        onChange={(e) =>
                                            setInputValue(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter code..."
                                    />
                                </FormField>
                            </Box>
                        ) : (
                            <Box
                                width="stretch"
                                direction="vertical"
                                gap="SP2"
                            >
                                <FormField label="New Password">
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter new password..."
                                    />
                                </FormField>

                                <FormField label="Confirm Password">
                                    <Input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) =>
                                            setConfirmNewPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Confirm new password..."
                                    />
                                </FormField>
                            </Box>
                        )
                    }
                />
            </Modal>

            <HelpModal
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                }}
            >
                <Tooltip content="Help Information">
                    <IconButton
                        onClick={() =>
                            setIsHelpModalOpen(true)
                        }
                        skin={'inverted'}
                    >
                        <InfoCircle />
                    </IconButton>
                </Tooltip>
            </div>
        </Box>
    );
};

export default LoginWrapper;
