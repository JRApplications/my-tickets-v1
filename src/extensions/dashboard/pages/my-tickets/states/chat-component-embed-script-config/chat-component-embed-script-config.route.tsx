import ChatComponentEmbedScriptConfigWrapper from './chat-component-embed-script-config.wrapper';

const ChatComponentEmbedScriptConfig = ({ permissions }: { permissions: string[] }) => {
  return (<ChatComponentEmbedScriptConfigWrapper permissions={permissions} />);
}

export default ChatComponentEmbedScriptConfig;

