import type { FC } from 'react';
import { useState } from 'react';
import {
    Box,
    Text,
    CustomModalLayout,
    Modal,
    TextButton,
} from '@wix/design-system';
import { dashboard } from '@wix/dashboard';
import type { HelpModalWrapperProps } from './help-modal.types';

const HelpModalWrapper: FC<HelpModalWrapperProps> = ({ isOpen, onClose, details }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const infoToCopy =
            `Version: ${details.instance?.appVersion}
    Instance ID: ${details.instance?.instanceId}
    Free Trial Available: ${details.instance?.freeTrialAvailable}
    Installed Wix Apps: ${details.site?.installedWixApps?.join(', ')}
    Site ID: ${details.site?.siteId}
    Site Owner: ${details.site?.ownerInfo?.email}`;
        navigator.clipboard.writeText(infoToCopy)
            .then(() => {
                setCopied(true);
                dashboard.showToast({ type: 'success', message: 'Information copied to clipboard!' });
                setTimeout(() => setCopied(false), 2000);
            })
            .catch((err) => {
                console.error('Failed to copy: ', err);
                dashboard.showToast({ type: 'error', message: 'Failed to copy information to clipboard.' });
            });
    };

    return (
        <Modal isOpen={isOpen}>
            <CustomModalLayout
                closeButtonProps={{
                    onClick: () => {
                        onClose();
                    }
                }}
                title="Help & Support"
                subtitle="Pass the information below to the app owner when requested."
                footnote={<Text>Powered by <Text weight='bold'>My Tickets</Text></Text>}
                content={
                    <Box direction='vertical' gap={2} padding={2}>
                        <Box direction='horizontal' align='left' WebkitJustifyContent='space-between'>
                            <Box gap={1} direction='vertical'>
                                <Text weight='bold' size='medium'>Version</Text>
                                <Text size='small'>{details.instance?.appVersion}</Text>
                            </Box>
                            <TextButton onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</TextButton>
                        </Box>

                        <Box gap={1} direction='vertical'>
                            <Text weight='bold' size='medium'>Instance ID</Text>
                            <Text size='small'>{details.instance?.instanceId}</Text>
                        </Box>
                        <Box gap={1} direction='vertical'>
                            <Text weight='bold' size='medium'>Free Trial Available</Text>
                            <Text size='small'>{details.instance?.freeTrialAvailable ? 'Yes' : 'No'}</Text>
                        </Box>
                        <Box gap={1} direction='vertical'>
                            <Text weight='bold' size='medium'>Installed Wix Apps</Text>
                            <Text size='small'>{details.site?.installedWixApps?.join(', ')}</Text>
                        </Box>
                        <Box gap={1} direction='vertical'>
                            <Text weight='bold' size='medium'>Site ID</Text>
                            <Text size='small'>{details.site?.siteId}</Text>
                        </Box>
                        <Box gap={1} direction='vertical'>
                            <Text weight='bold' size='medium'>Site Owner</Text>
                            <Text size='small'>{details.site?.ownerInfo?.email}</Text>
                        </Box>
                    </Box>
                }
            />
        </Modal>
    )
};

export default HelpModalWrapper;