import ViewTeamsWrapper from './view-teams.wrapper';
import type { ViewTeamsProps } from './teams.types';
const ViewTeams = ({ permissions, agentId, teamId, onModalOpen, isTeamLimitReached }: ViewTeamsProps) => {
    return <ViewTeamsWrapper agentId={agentId} teamId={teamId} permissions={permissions} onModalOpen={onModalOpen} isTeamLimitReached={isTeamLimitReached} />;
}

export default ViewTeams;
