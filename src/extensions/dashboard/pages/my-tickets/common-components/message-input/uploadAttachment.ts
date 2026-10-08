import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { resolveAttachmentMimeType } from '@jrapps/my_tickets_common_types';

export async function uploadAttachment(file: File): Promise<{ id: string; name: string; url: string }> {
    const mimeType = resolveAttachmentMimeType(file.name);
    if (!mimeType) {
        throw new Error('Unsupported file type');
    }

    const baseApiUrl = new URL(import.meta.url).origin;

    const urlResponse = await myTicketsFetchWithAuth(`${baseApiUrl}/api/attachments/getUploadUrl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType, fileName: file.name }),
    });
    const urlData = await urlResponse.json();
    if (!urlResponse.ok || !urlData.success || !urlData.uploadUrl) {
        throw new Error(urlData?.error ?? 'Failed to get upload URL');
    }

    // The upload URL is pre-signed, so no auth headers.
    const uploadResponse = await fetch(`${urlData.uploadUrl}?filename=${encodeURIComponent(file.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
    });
    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
    }

    const uploaded = await uploadResponse.json();
    const descriptor = uploaded?.file;
    if (!descriptor?.id || !descriptor?.url) {
        throw new Error('Upload response missing file details');
    }

    return { id: descriptor.id, name: descriptor.displayName ?? file.name, url: descriptor.url };
}
