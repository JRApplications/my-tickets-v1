import { Modal, CustomModalLayout, Input, FormField, Box, InputArea, Text, Loader, SkeletonRectangle } from '@wix/design-system';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import useTeams from './hooks/useTeams';
import { useEffect, useState } from 'react';

const TeamModal = ({ isOpen, onClose, state, teamId }: { isOpen: boolean; onClose: () => void; state: 'create' | 'edit'; teamId?: string }) => {
    const emptyTeam = { _id: undefined as string | undefined, name: '', description: '', department: '', email: '', teamPictureUrl: '' };
    const [teamData, setTeamData] = useState(emptyTeam);
    const { getTeamData, updateTeamData, createTeam, isLoading, isError, isCreating } = useTeams();

    const handleInputChange = (field: string, value: string) => {
        setTeamData((prevData: any) => ({
            ...prevData,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        if (!teamData.name.trim() || !teamData.description.trim() || !teamData.email.trim()) {
            ShowToast({ message: 'Enter a team name, description, and email before saving.', type: 'error' });
            return;
        }
        let result;
        if (state === 'create') {
            result = await createTeam(teamData);
        } else if (state === 'edit') {
            if (!teamId) {
                return;
            }
            result = await updateTeamData(teamId, teamData);
        }
        if (result?.success) {
            ShowToast({ message: state === 'create' ? 'Team created.' : 'Team changes saved.', type: 'success' });
            onClose();
        } else {
            ShowToast({ message: `Failed to ${state === 'create' ? 'create' : 'save'} team. Please try again.`, type: 'error' });
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        setTeamData(emptyTeam);
        if (state === 'edit' && teamId) {
            getTeamData(teamId).then(data => data && setTeamData(data));
        }
    }, [isOpen, state, teamId]);

    return (
        <Modal isOpen={isOpen} onRequestClose={isCreating ? undefined : onClose}>
            <CustomModalLayout
                primaryButtonText={!isCreating ? (state === 'create' ? 'Create Team' : 'Save Changes') : <Loader size='tiny' />}
                secondaryButtonText="Cancel"
                closeButtonProps={{ onClick: () => { if (!isCreating) onClose(); }, size: 'large' }}
                title={<CustomModalLayout.Title>{state === 'create' ? 'Create Team' : 'Edit Team'}</CustomModalLayout.Title>}
                subtitle={state === 'create' ? "Create a new team" : "Edit team details"}
                primaryButtonProps={{
                    onClick: handleSave,
                    disabled: isCreating || isLoading,
                }}
                secondaryButtonProps={{
                    onClick: () => {
                        onClose();
                    },
                    disabled: isCreating,
                }}
                showHeaderDivider
                showFooterDivider
            >
                {isError && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='error' text='An error occurred. Try again or contact support.' />
                    </Box>
                )}
                {!isError && (
                    <Box direction='vertical' gap={2}>
                        {isLoading && !isCreating && (
                            <Box direction='vertical' gap={2}>
                                <SkeletonRectangle width='100%' height='35px' />
                                <SkeletonRectangle width='100%' height='35px' />
                                <SkeletonRectangle width='100%' height='100px' />
                                <SkeletonRectangle width='100%' height='35px' />
                            </Box>
                        )}
                        {!isLoading && (
                            <Box direction='vertical' gap={2}>
                                <FormField label="Team Name" required >
                                    <Input placeholder="Enter team name" value={teamData.name} disabled={isCreating} onChange={(e) => handleInputChange('name', e.target.value)} />
                                </FormField>
                                <FormField label="Department">
                                    <Input placeholder="Enter department" value={teamData.department || ''} disabled={isCreating} onChange={(e) => handleInputChange('department', e.target.value)} />
                                </FormField>
                                <FormField label="Team Description" required>
                                    <InputArea placeholder="Enter team description" minHeight={'100px'} value={teamData.description} disabled={isCreating} onChange={(e) => handleInputChange('description', e.target.value)} />
                                </FormField>
                                <FormField label="Team Email" required>
                                    <Input placeholder="Enter team email" value={teamData.email} disabled={isCreating} onChange={(e) => handleInputChange('email', e.target.value.replace(/@mytickets\.internal$/i, ''))} suffix={<Box verticalAlign='middle'><Text skin='disabled'>@mytickets.internal</Text></Box>} />
                                </FormField>
                            </Box>
                        )}
                    </Box>
                )}
            </CustomModalLayout>
        </Modal>
    );
};

export default TeamModal;
