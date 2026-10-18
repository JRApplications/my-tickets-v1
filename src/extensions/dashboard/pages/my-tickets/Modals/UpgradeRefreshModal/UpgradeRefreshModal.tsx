import { Box, MessageModalLayout, Modal, Text } from '@wix/design-system';

export function UpgradeRefreshModal({ isOpen }: { isOpen: boolean }) {
    return (
        <Modal
            isOpen={isOpen}
            contentLabel="Refresh to apply your upgrade"
            shouldCloseOnOverlayClick={false}
            shouldDisplayCloseButton={false}
        >
            <MessageModalLayout
                title="Refresh to apply your upgrade"
                skin="premium"
                content={
                    <Box paddingBottom={5}>
                        <Text>
                            Complete your plan change in the Wix page that opened.
                            Once it's complete, refresh this page to apply your upgraded features.
                        </Text>
                    </Box>
                }
            />
        </Modal>
    );
}
