import type { FC } from 'react';

import LoginWrapper from './login.wrapper';

import type { LoginPageProps } from './login.types';

const LoginPage: FC<LoginPageProps> = ({
    handleLoginSuccess,
    isGettingReady,
}) => {
    return (
        <LoginWrapper
            onLoginSuccess={handleLoginSuccess}
            isGettingReady={isGettingReady}
        />
    );
};

export default LoginPage;