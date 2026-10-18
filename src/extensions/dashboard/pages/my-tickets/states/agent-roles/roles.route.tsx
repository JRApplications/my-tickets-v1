import RolesWrapper from './roles-wrapper';
import type { CurrentAppPlan } from '../../auth/fetchCurrentAppPlan';

interface Props {
    permissions: string[];
    appPlan: CurrentAppPlan | null;
}

const AgentRoles = ({
    permissions,
    appPlan,
}: Props) => {
    return (
        <RolesWrapper permissions={permissions} appPlan={appPlan} />
    )
}

export default AgentRoles;
