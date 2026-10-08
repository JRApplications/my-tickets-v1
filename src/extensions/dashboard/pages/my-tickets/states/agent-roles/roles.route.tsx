import RolesWrapper from './roles-wrapper';

interface Props {
    permissions: string[];
}

const AgentRoles = ({
    permissions,
}: Props) => {
    return (
        <RolesWrapper permissions={permissions} />
    )
}

export default AgentRoles;