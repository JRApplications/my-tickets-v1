import type { APIRoute } from 'astro';
import { resolveAttachmentMimeType } from '@jrapps/my_tickets_common_types';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { captureError } from '../reportError';
import { getOwnedConversation } from './conversation-auth';

const MAX_FILE_NAME_LENGTH = 100;

const WIX_ERROR_MESSAGES: Record<string, string> = {
    UNSUPPORTED_FILE_FORMAT: 'This file format is not supported.',
    FILE_SIZE_OVER_LIMIT: 'This file is too large.',
    SITE_QUOTA_EXCEEDED: 'The site media storage quota has been exceeded.',
    ZERO_FILE_SIZE: 'This file is empty.',
    MISMATCH_MIME_TYPE: 'The file type does not match its extension.',
};

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    let clientMessage = 'Failed to generate upload URL';

    try {
        const authToken = request.headers.get('Authorization');
        if (!authToken) {
            status = 401;
            clientMessage = 'A site visitor session is required to upload an attachment.';
            throw new Error('Authorization token is missing');
        }

        const body = await request.json();
        const { conversationId, fileName, mimeType } = body;
        if (typeof conversationId !== 'string' || !conversationId) {
            status = 400;
            clientMessage = 'A valid chat conversation is required.';
            throw new Error('Invalid conversation ID');
        }
        await getOwnedConversation(conversationId);

        if (typeof fileName !== 'string' || fileName.length === 0 || fileName.length > MAX_FILE_NAME_LENGTH) {
            status = 400;
            clientMessage = 'Invalid file name';
            throw new Error('Invalid file name');
        }
        if (typeof mimeType !== 'string' || resolveAttachmentMimeType(fileName) !== mimeType) {
            status = 400;
            clientMessage = 'This file type is not supported.';
            throw new Error('Unsupported file type');
        }

        const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        const response = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${elevatedAuthToken}`,
            },
            body: JSON.stringify({
                mimeType,
                fileName,
                filePath: '/my-tickets/attachments',
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const wixCode = errorBody?.details?.applicationError?.code;
            if (response.status === 400 && wixCode && WIX_ERROR_MESSAGES[wixCode]) {
                status = 400;
                clientMessage = WIX_ERROR_MESSAGES[wixCode];
            }
            throw new Error(`Failed to generate chat attachment upload URL: ${response.status} ${wixCode ?? ''}`);
        }

        const { uploadUrl } = await response.json();
        if (typeof uploadUrl !== 'string' || !uploadUrl) {
            throw new Error('Upload URL missing from response');
        }

        return new Response(JSON.stringify({ success: true, uploadUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error('Failed to generate chat attachment upload URL:', error);
        return new Response(JSON.stringify({ success: false, error: clientMessage, requestId }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'x-mytickets-request-id': requestId,
            },
        });
    }
};
