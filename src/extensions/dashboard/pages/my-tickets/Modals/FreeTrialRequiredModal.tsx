import { Box, CustomModalLayout, Modal, Text } from '@wix/design-system';

interface FreeTrialRequiredModalProps {
    isOpen: boolean;
    freeTrialAvailable: boolean;
    upgradeUrl?: string;
}

export function FreeTrialRequiredModal({ isOpen, freeTrialAvailable, upgradeUrl }: FreeTrialRequiredModalProps) {
    return (
        <Modal isOpen={isOpen}>
            <CustomModalLayout
                title={<CustomModalLayout.Title>{freeTrialAvailable ? 'Start your free trial' : 'Choose a My Tickets plan'}</CustomModalLayout.Title>}
                subtitle={freeTrialAvailable
                    ? 'A plan is required to finish setting up My Tickets. Start your free trial from the Wix pricing page to continue.'
                    : 'A plan is required to finish setting up My Tickets. Choose a plan from the Wix pricing page to continue.'}
                primaryButtonText={freeTrialAvailable ? 'Start free trial' : 'View plans'}
                primaryButtonProps={{
                    onClick: () => {
                        if (upgradeUrl) window.open(upgradeUrl, '_blank', 'noopener,noreferrer');
                    },
                    disabled: !upgradeUrl,
                }}
                showHeaderDivider
                showFooterDivider
            >
                <Box direction="vertical" gap={2}>
                    <Text>
                        {freeTrialAvailable
                            ? 'The free trial gives you access to your selected plan. After starting it in Wix, refresh this page to continue.'
                            : 'After choosing a plan in Wix, refresh this page to continue.'}
                    </Text>
                </Box>
            </CustomModalLayout>
        </Modal>
    );
}
