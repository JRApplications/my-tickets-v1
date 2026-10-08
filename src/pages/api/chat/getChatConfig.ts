// src/pages/api/chat/getChatConfig.ts
import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import {
  initialChatQuestionsEnabled,
  getInitialChatQuestions,
  getBusinessHours,
} from './utils';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const [enableChatQuestions, chatQuestions, businessSupportHours] =
      await Promise.all([
        initialChatQuestionsEnabled(),
        getInitialChatQuestions(),
        getBusinessHours(),
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: { enableChatQuestions, chatQuestions, businessSupportHours },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
    console.error('Failed to get chat config:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message, requestId }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId } }
    );
  }
};
