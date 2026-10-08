import type { SystemEventType } from '../SiteChatComponentNew.types';

const systemEventLabels: Record<SystemEventType, string> = {
  AGENT_JOINED: 'Agent joined',
  AGENT_LEFT: 'Agent left',
  USER_JOINED: 'You joined',
  USER_LEFT: 'You left',
  CHAT_ENDED: 'Chat ended',
  CHAT_REOPENED: 'Chat reopened',
  CHAT_TRANSFERRED: 'Chat transferred',
  WAITING_FOR_AGENT: 'Waiting for an agent',
};

export function getSystemLabel(event: string): string {
  return systemEventLabels[event as SystemEventType] ?? event;
}

export function isSystemEventType(value: string): value is SystemEventType {
  return value in systemEventLabels;
}
