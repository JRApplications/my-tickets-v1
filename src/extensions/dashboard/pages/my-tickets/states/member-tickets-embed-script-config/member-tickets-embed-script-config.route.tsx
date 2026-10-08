import MemberTicketsEmbedScriptConfigWrapper from './member-tickets-embed-script-config.wrapper';

const MemberTicketsEmbedScriptConfig = ({ permissions }: { permissions: string[] }) => {
  return (<MemberTicketsEmbedScriptConfigWrapper permissions={permissions} />);
}

export default MemberTicketsEmbedScriptConfig;

