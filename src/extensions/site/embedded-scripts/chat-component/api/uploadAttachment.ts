import { MAX_ATTACHMENT_BYTES, resolveAttachmentMimeType } from '@jrapps/my_tickets_common_types';
import { myWixClient } from '../wixClient';

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
}

export async function uploadChatAttachment(file: File, conversationId: string): Promise<ChatAttachment> {
  const mimeType = resolveAttachmentMimeType(file.name);
  if (!mimeType) throw new Error('This file type is not supported.');
  if (file.size === 0) throw new Error('This file is empty.');
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`This file is larger than ${Math.floor(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`);
  }
  if (file.name.length > 100) throw new Error('File names must be 100 characters or fewer.');

  const baseApiUrl = new URL(import.meta.url).origin;
  const urlResponse = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/getUploadUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, fileName: file.name, mimeType }),
  });
  const urlData = await urlResponse.json();
  if (!urlResponse.ok || !urlData.success || typeof urlData.uploadUrl !== 'string') {
    throw new Error(urlData.error ?? 'Failed to prepare attachment upload.');
  }

  const uploadResponse = await fetch(`${urlData.uploadUrl}?filename=${encodeURIComponent(file.name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error('Failed to upload attachment. Please try again.');

  const uploaded = await uploadResponse.json();
  const descriptor = uploaded?.file;
  if (typeof descriptor?.id !== 'string' || typeof descriptor?.url !== 'string') {
    throw new Error('The upload service returned incomplete attachment details.');
  }

  return {
    id: descriptor.id,
    name: typeof descriptor.displayName === 'string' ? descriptor.displayName : file.name,
    url: descriptor.url,
  };
}
