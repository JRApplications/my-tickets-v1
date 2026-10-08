import { Modal, CustomModalLayout, Input, FormField, Box, SectionHeader, Text, Avatar, Dropdown, Loader, SkeletonRectangle, SkeletonCircle, SkeletonLine } from '@wix/design-system';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { useState, useEffect } from 'react';
import useAgents from './hooks/useAgents';

const AgentModal = ({ isOpen, onClose, state, agentId }: { isOpen: boolean; onClose: () => void; state: 'create' | 'edit'; agentId?: string }) => {
    const [agentDetails, setAgentDetails] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        team: '',
        profilePicture: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const { getAgentData, updateAgentData, createAgent, isLoading, isError, roles, teams } = useAgents();

    useEffect(() => {
        if (!isOpen) return;
        setAgentDetails({ name: '', email: '', phone: '', role: '', team: '', profilePicture: '' });
        if (state === 'edit' && agentId) {
            getAgentData(agentId).then(data => {
                if (data) {
                    setAgentDetails({
                        name: data.name || '',
                        email: (data.email || '').replace(/@mytickets\.internal$/i, ''),
                        phone: data.phoneNumber || '',
                        role: data.role?._id || '',
                        team: data.team?._id || '',
                        profilePicture: data.profilePictureUrl || '',
                    });
                }
            });
        }
    }, [isOpen, state, agentId]);

    const handleSave = async () => {
        if (!agentDetails.name.trim() || !agentDetails.email.trim() || !agentDetails.role || !agentDetails.team) {
            ShowToast({ message: 'Enter the agent name and email, and select a role and team.', type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                _id: agentId,
                email: agentDetails.email.trim().replace(/@mytickets\.internal$/i, ''),
                name: agentDetails.name.trim(),
                role: agentDetails.role,
                team: agentDetails.team,
                phoneNumber: agentDetails.phone.trim(),
                profilePictureUrl: agentDetails.profilePicture.trim(),
            };
            const result = state === 'create'
                ? await createAgent(payload)
                : agentId
                    ? await updateAgentData(agentId, payload)
                    : { success: false };
            if (result.success) {
                ShowToast({ message: state === 'create' ? 'Agent created.' : 'Agent changes saved.', type: 'success' });
                onClose();
            } else {
                ShowToast({ message: `Failed to ${state === 'create' ? 'create' : 'save'} agent. Please try again.`, type: 'error' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                secondaryButtonText="Cancel"
                closeButtonProps={{ onClick: () => { if (!isSaving) onClose(); }, size: 'large' }}
                primaryButtonText={!isSaving ? (state === 'create' ? 'Create Agent' : 'Save Changes') : <Loader size='tiny' />}
                title={<CustomModalLayout.Title>{state === 'create' ? 'Create Agent' : 'Edit Agent'}</CustomModalLayout.Title>}
                subtitle={state === 'create' ? 'Create a new agent' : 'Edit agent details'}
                primaryButtonProps={{
                    onClick: handleSave,
                    disabled: isSaving || (state === 'edit' && !agentId),
                }}
                secondaryButtonProps={{
                    onClick: () => {
                        onClose();
                    },
                    disabled: isSaving,
                }}
            >
                {isError && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='error' text='An error occurred. Try again or contact support.' />
                    </Box>
                )}
                {!isError && (
                    <Box direction='vertical' gap={2} width='100%'>
                        <SectionHeader title="Basic Information" horizontalPadding='xxTiny' />
                        <Box direction='vertical' gap={2} paddingLeft={1} paddingRight={1} width='100%'>
                            <Box gap={2} width='100%'>
                                {isLoading && (
                                    <Box gap={2} width='100%'>
                                        <Box direction='vertical' width='100%'>
                                            <SkeletonRectangle height={'35px'} width='100%' />
                                        </Box>
                                        <Box direction='vertical' width='100%'>
                                            <SkeletonRectangle height={'35px'} width='100%' />
                                        </Box>
                                    </Box>
                                )}

                                {!isLoading && (
                                    <Box gap={2} width='100%'>
                                        <FormField label="Agent Name" required>
                                            <Input placeholder="Enter agent name" value={agentDetails.name} disabled={isSaving} onChange={(e) => setAgentDetails({ ...agentDetails, name: e.target.value })} />
                                        </FormField>
                                        <FormField label="Agent Email" required>
                                            <Input placeholder="Enter agent email" value={agentDetails.email} disabled={isSaving} onChange={(e) => setAgentDetails({ ...agentDetails, email: e.target.value })} suffix={<Box verticalAlign='middle'><Text skin='disabled'>@mytickets.internal</Text></Box>} />
                                        </FormField>
                                    </Box>
                                )}
                            </Box>
                            <Box width='100%' direction='vertical'>
                                {isLoading && (
                                    <SkeletonRectangle height={'35px'} width="100%" />
                                )}
                                {!isLoading && (
                                    <FormField label="Agent Phone">
                                        <Input placeholder="Enter agent phone" value={agentDetails.phone} disabled={isSaving} onChange={(e) => setAgentDetails({ ...agentDetails, phone: e.target.value })} />
                                    </FormField>
                                )}
                            </Box>
                        </Box>
                        <SectionHeader title="Role & Team" horizontalPadding='xxTiny' />
                        <Box gap={2} paddingLeft={1} paddingRight={1} width='100%'>
                            {isLoading && (
                                <Box gap={2} width='100%'>
                                        <Box direction='vertical' width='100%'>
                                            <SkeletonRectangle height={'35px'} width='100%' />
                                        </Box>
                                        <Box direction='vertical' width='100%'>
                                            <SkeletonRectangle height={'35px'} width='100%' />
                                        </Box>
                                    </Box>
                            )}
                            {!isLoading && (
                                <FormField label="Agent Role" required>
                                    <Dropdown options={roles} placeholder="Select agent role" selectedId={agentDetails.role} disabled={isSaving} onSelect={(e) => setAgentDetails({ ...agentDetails, role: String(e.id) })} />
                                </FormField>
                            )}
                            {!isLoading && (
                                <FormField label="Agent Team" required>
                                    <Dropdown placeholder="Select team" options={teams} selectedId={agentDetails.team} disabled={isSaving} onSelect={(e) => setAgentDetails({ ...agentDetails, team: String(e.id) })} />
                                </FormField>
                            )}
                        </Box>
                        <SectionHeader title="Profile Picture" horizontalPadding='xxTiny' />
                        <Box paddingLeft={1} paddingRight={1} width='100%'>
                            <Box gap={4} verticalAlign='top' width='100%'>
                                {!isLoading && (
                                    <Avatar size='size72' imgProps={agentDetails.profilePicture ? { src: agentDetails.profilePicture } : undefined} />
                                )}
                                {isLoading && (
                                    <SkeletonCircle diameter={'75px'} />

                                )}
                                <Box direction='vertical' gap={1} width='100%'>
                                    {!isLoading && (
                                        <FormField label="Profile picture URL">
                                            <Input placeholder="https://..." value={agentDetails.profilePicture} disabled={isSaving} onChange={(e) => setAgentDetails({ ...agentDetails, profilePicture: e.target.value })} />
                                        </FormField>
                                    )}
                                    {isLoading && (
                                        <SkeletonRectangle height={'35px'} width='100%' />
                                    )}

                                    {!isLoading && (
                                        <Text skin='disabled'>Paste a hosted JPG or PNG image URL.</Text>
                                    )}

                                    {isLoading && (
                                        <SkeletonLine width='50%' />
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}
            </CustomModalLayout>
        </Modal>
    );
};

export default AgentModal;
