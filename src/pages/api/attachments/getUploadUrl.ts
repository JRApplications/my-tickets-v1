import type { APIRoute } from "astro";
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { resolveAttachmentMimeType } from '@jrapps/my_tickets_common_types';

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
        const [elevatedAuthToken, hasPermission] = await Promise.all([
            generateElevatedAuthToken(authToken),
            checkPermission(authToken, ['ADMIN', 'USER'])
        ]);

        if (!hasPermission) {
            status = 403;
            throw new Error('Insufficient permissions');
        }

        const { mimeType, fileName } = await request.json();

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

        const response = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${elevatedAuthToken}`
            },
            body: JSON.stringify({
                mimeType,
                fileName,
                filePath: '/my-tickets/attachments'
            })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const wixCode = errorBody?.details?.applicationError?.code;
            if (response.status === 400 && WIX_ERROR_MESSAGES[wixCode]) {
                status = 400;
                clientMessage = WIX_ERROR_MESSAGES[wixCode];
            }
            throw new Error(`Failed to generate upload URL: ${response.status} ${wixCode ?? ''}`);
        }

        const { uploadUrl } = await response.json();
        if (!uploadUrl) {
            throw new Error('Upload URL missing from response');
        }

        return new Response(JSON.stringify({ success: true, uploadUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: clientMessage }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
