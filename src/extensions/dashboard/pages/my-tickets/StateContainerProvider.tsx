import { Box } from '@wix/design-system';
import React from 'react';

export const StateContainerProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <Box width='100%' height='100%' boxSizing='border-box' maxWidth='100%' maxHeight='100%' minWidth={0} backgroundColor={'var(--wds-color-fill-surface-sunken)'}>
            {children}
        </Box>
    );
};