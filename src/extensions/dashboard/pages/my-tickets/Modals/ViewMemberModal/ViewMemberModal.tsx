import { Modal, CustomModalLayout, Box, Card, Input, Button, Loader, SkeletonRectangle, EmptyState, FormField, Dropdown, Accordion, accordionItemBuilder, Text } from '@wix/design-system';
import { useViewMemberModal } from './hooks/useViewMemberModal';
import { ExtensionIds } from '@jrapps/my_tickets_common_types';
import {
    Phone as PhoneIcon,
    Location as LocationIcon,
    PaidPlans as PaidPlansIcon,
    WixBooking as WixBookingIcon,
    Order as OrderIcon,
    WixForum as WixForumIcon
} from '@wix/wix-ui-icons-common/odeditor';
import { dashboard } from '@wix/dashboard';
import { useState } from 'react';
const ComponentsSize = 'medium';

interface AccordionItem {
    id: string | number;
    appId: string;
    title: string;
    subtitle: string;
}


const ViewMemberModal = ({ isOpen, onClose, memberId }: { isOpen: boolean; onClose: () => void; memberId: string }) => {
    const [selectedAddress, setSelectedAddress] = useState<any>(null);
    const {
        member,
        tickets,
        storeOrders,
        pricingPlanOrders,
        bookings,
        isLoading,
        isError,
        handleBlockMember,
        handleUnblockMember,
        isBlockingOrUnblocking
    } = useViewMemberModal(memberId, isOpen);

    const isMemberBlocked = member?.status === 'BLOCKED';

    const handleView = async (id: string | number) => {
        const pageUrl = await dashboard.getPageUrl({
            pageId: ExtensionIds.DASHBOARD_PAGE,
            relativeUrl: `?stateOverride=view-tickets&ticketId=${id}`,
        });

        window.open(pageUrl, '_blank');
    };

    const AccordionItems = ({ items }: { items: AccordionItem[] }) => {
        if (!items || items.length === 0) {
            return null;
        }
        return items.map(item => (
            <Box key={item.id} verticalAlign="middle" width='100%' WebkitJustifyContent="space-between" paddingLeft={3} paddingRight={3}>
                <Box direction='vertical'>
                    <Text weight='bold'>{item.title}</Text>
                    <Text size='small'>{item.subtitle}</Text>
                </Box>
                <Button size="small" onClick={() => handleView(item.id)} >View</Button>
            </Box>
        ));
    }

    return (
        <Modal
            isOpen={isOpen}
            screen="full"
            onRequestClose={onClose}
        >
            <CustomModalLayout
                title={
                    <CustomModalLayout.Title titleSize="medium">
                        View Member
                    </CustomModalLayout.Title>
                }
                removeContentPadding
                subtitle="View member details"
                actionsSize={ComponentsSize}
                closeButtonProps={{
                    onClick: () => {
                        onClose();
                    },
                    size: 'large',
                }}
                height="96vh"
                maxHeight="96vh"
                width="100vw"
                showHeaderDivider
                overflowY="hidden"
                content={
                    <Box
                        direction="vertical"
                        height="100%"
                        minHeight={0}
                        flexGrow={1}
                        boxSizing="border-box"
                        overflow="hidden"
                        width='100%'
                    >
                        <Box
                            direction="horizontal"
                            gap="12px"
                            width="100%"
                            height="100%"
                            minHeight={0}
                            padding="12px"
                            boxSizing="border-box"
                        >
                            {/* LEFT CARD */}
                            <Card
                                dataHook="create-ticket-card"
                                stretchVertically
                                hideOverflow
                            >
                                <Card.Header title="Tickets & Orders" />

                                <Card.Content>
                                    {isError && (
                                        <Box
                                            direction="vertical"
                                            align="center"
                                            verticalAlign="middle"
                                            width="100%"
                                            height="100%"
                                        >
                                            <Loader text="Error loading member tickets and orders." status='error' />
                                        </Box>
                                    )}

                                    {!isError && (
                                        <Box
                                            direction="vertical"
                                            gap={4}
                                            height="100%"
                                            minHeight={0}
                                        >
                                            <Accordion
                                                size="large"
                                                items={[
                                                    accordionItemBuilder({
                                                        title: isLoading ? <SkeletonRectangle width="150px" height="20px" /> : <Text size="medium" weight="bold">Tickets</Text>,
                                                        prefix: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : <WixForumIcon />,
                                                        expandLabel: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : undefined,
                                                        showLabel: isLoading ? 'always' : undefined,
                                                        buttonType: isLoading ? "node" : undefined,
                                                        disabled: isLoading,
                                                        children: (
                                                            isLoading ? null : <AccordionItems items={tickets} />
                                                        ),
                                                    }),
                                                    accordionItemBuilder({
                                                        title: isLoading ? <SkeletonRectangle width="150px" height="20px" /> : <Text size="medium" weight="bold">Store Orders</Text>,
                                                        prefix: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : <OrderIcon />,
                                                        expandLabel: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : undefined,
                                                        showLabel: isLoading ? 'always' : undefined,
                                                        buttonType: isLoading ? "node" : undefined,
                                                        disabled: isLoading,
                                                        children: (
                                                            isLoading ? null : <AccordionItems items={storeOrders} />
                                                        ),
                                                    }),
                                                    accordionItemBuilder({
                                                        title: isLoading ? <SkeletonRectangle width="150px" height="20px" /> : <Text size="medium" weight="bold">Bookings</Text>,
                                                        prefix: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : <WixBookingIcon />,
                                                        expandLabel: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : undefined,
                                                        showLabel: isLoading ? 'always' : undefined,
                                                        buttonType: isLoading ? "node" : undefined,
                                                        disabled: isLoading,
                                                        children: (
                                                            isLoading ? null : <AccordionItems items={bookings} />
                                                        ),
                                                    }),
                                                    accordionItemBuilder({
                                                        title: isLoading ? <SkeletonRectangle width="150px" height="20px" /> : <Text size="medium" weight="bold">Pricing Plan Subscriptions</Text>,
                                                        prefix: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : <PaidPlansIcon />,
                                                        expandLabel: isLoading ? <SkeletonRectangle width="30px" height="30px" /> : undefined,
                                                        showLabel: isLoading ? 'always' : undefined,
                                                        buttonType: isLoading ? "node" : undefined,
                                                        disabled: isLoading,
                                                        children: (
                                                            isLoading ? null : <AccordionItems items={pricingPlanOrders} />
                                                        ),
                                                    }),
                                                ]}
                                            />
                                        </Box>
                                    )}

                                </Card.Content>
                            </Card>

                            {/* RIGHT CARD */}
                            <Card
                                dataHook="create-ticket-card"
                                stretchVertically
                                hideOverflow
                            >
                                <Card.Header
                                    title="View Member Details"
                                    suffix={
                                        <Button
                                            size='small'
                                            skin="destructive"
                                            priority={isMemberBlocked ? 'secondary' : 'primary'}
                                            onClick={() => {
                                                isMemberBlocked ? handleUnblockMember() : handleBlockMember();
                                            }}
                                        >
                                            {isBlockingOrUnblocking && <Loader size="tiny" />}
                                            {isMemberBlocked ? isBlockingOrUnblocking ? '' : 'Unblock Member' : isBlockingOrUnblocking ? '' : 'Block Member'}
                                        </Button>
                                    }
                                />

                                <Card.Content>
                                    {isError && (
                                        <Box
                                            direction="vertical"
                                            align="center"
                                            verticalAlign="middle"
                                            width="100%"
                                            height="100%"
                                        >
                                            <Loader text="Error loading member details." status='error' />
                                        </Box>
                                    )}

                                    {!isError && (
                                        <Box
                                            direction="vertical"
                                            height="100%"
                                            minHeight={0}
                                        >

                                            <Box
                                                direction="vertical"
                                                gap={2}
                                                flexGrow={1}
                                                minHeight={0}
                                                boxSizing="border-box"
                                                overflowY="auto"
                                            >
                                                {/* First / Last Name */}
                                                <Box
                                                    direction="horizontal"
                                                    gap={2}
                                                    width="100%"
                                                >
                                                    <Box
                                                        flexGrow={1}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? (
                                                            <SkeletonRectangle width="100%" height="35px" />
                                                        ) : (
                                                            <FormField label="First Name">
                                                                <Input
                                                                    size={ComponentsSize}
                                                                    value={
                                                                        member?.contact?.firstName || ''
                                                                    }
                                                                    readOnly
                                                                />
                                                            </FormField>
                                                        )}
                                                    </Box>

                                                    <Box
                                                        flexGrow={1}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? (
                                                            <SkeletonRectangle width="100%" height="35px" />
                                                        ) : (
                                                            <FormField label="Last Name">
                                                                <Input
                                                                    value={
                                                                        member?.contact?.lastName || ''
                                                                    }
                                                                    readOnly
                                                                />
                                                            </FormField>
                                                        )}
                                                    </Box>
                                                </Box>

                                                {/* Email / Phones / Addresses */}
                                                <Box
                                                    direction="vertical"
                                                    gap={2}
                                                >
                                                    {isLoading ? (
                                                        <SkeletonRectangle width="100%" height="35px" />
                                                    ) : (
                                                        <FormField label="Email">
                                                            <Input
                                                                size={ComponentsSize}
                                                                value={
                                                                    member?.loginEmail ||
                                                                    member?.email ||
                                                                    ''
                                                                }
                                                                readOnly
                                                            />
                                                        </FormField>
                                                    )}

                                                    {isLoading ? (
                                                        <SkeletonRectangle width="100%" height="35px" />
                                                    ) : (
                                                        <FormField label="Phones">
                                                            <Dropdown
                                                                options={
                                                                    member?.contact?.phones?.map(
                                                                        (phone: any) => ({
                                                                            id: phone,
                                                                            value: phone,
                                                                        })
                                                                    ) || []
                                                                }
                                                                selectedId={
                                                                    member?.contact?.phones?.[0] ||
                                                                    ''
                                                                }
                                                                placeholder="No phones available"
                                                                prefix={
                                                                    <Box verticalAlign="middle">
                                                                        <PhoneIcon />
                                                                    </Box>
                                                                }
                                                                size={ComponentsSize}
                                                            />
                                                        </FormField>
                                                    )}

                                                    {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (<FormField label="Addresses">
                                                        <Dropdown
                                                            options={
                                                                member?.contact?.addresses?.map(
                                                                    (ad: any) => ({
                                                                        id: ad._id,
                                                                        value: ad.addressLine,
                                                                    })
                                                                ) || []
                                                            }
                                                            selectedId={
                                                                selectedAddress?._id || ''
                                                            }
                                                            onSelect={(option) => {
                                                                const addr =
                                                                    member?.contact?.addresses?.find(
                                                                        (ad: any) =>
                                                                            ad._id === option.id
                                                                    );

                                                                setSelectedAddress(
                                                                    addr || null
                                                                );
                                                            }}
                                                            placeholder="No addresses available"
                                                            size={ComponentsSize}
                                                            prefix={
                                                                <Box verticalAlign="middle">
                                                                    <LocationIcon />
                                                                </Box>
                                                            }
                                                        />
                                                    </FormField>
                                                    )}
                                                </Box>

                                                {/* Street */}
                                                <Box
                                                    direction="horizontal"
                                                    gap={2}
                                                    width="100%"
                                                >
                                                    <Box
                                                        flexGrow={2}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (<FormField label="Street">
                                                            <Input
                                                                size={ComponentsSize}
                                                                value={selectedAddress?.addressLine || ''}
                                                                readOnly
                                                            />
                                                        </FormField>
                                                        )}
                                                    </Box>

                                                    <Box
                                                        flexGrow={1}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (<FormField label="Street Line 2">
                                                            <Input
                                                                size={ComponentsSize}
                                                                value={selectedAddress?.addressLine2 || ''}
                                                                readOnly
                                                            />
                                                        </FormField>
                                                        )}
                                                    </Box>
                                                </Box>

                                                {/* City / Zip */}
                                                <Box
                                                    direction="horizontal"
                                                    gap={2}
                                                    width="100%"
                                                >
                                                    <Box
                                                        flexGrow={1}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (<FormField label="City">
                                                            <Input
                                                                size={ComponentsSize}
                                                                value={selectedAddress?.city || ''}
                                                                readOnly
                                                            />
                                                        </FormField>
                                                        )}
                                                    </Box>

                                                    <Box
                                                        flexGrow={1}
                                                        minWidth={0}
                                                    >
                                                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (<FormField label="Zip / Postal Code">
                                                            <Input
                                                                size={ComponentsSize}
                                                                value={selectedAddress?.postalCode || ''}
                                                                readOnly
                                                            />
                                                        </FormField>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>


                                            {!member && !isLoading && (
                                                <Box width='100%' height='100%' verticalAlign="middle">
                                                    <EmptyState
                                                        title="No Member found"
                                                        subtitle="Try again or refresh the page."
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </Card.Content>
                            </Card>
                        </Box >
                    </Box>
                }
            />
        </Modal>
    )
};

export default ViewMemberModal;


