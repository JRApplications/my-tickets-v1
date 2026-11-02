import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const getConversation = auth.elevate(items.get);
export const insertConversation = auth.elevate(items.insert);
export const patchConversation = auth.elevate(items.patch);

/** Only the Wix site identity that created a visitor conversation may use the public chat routes. */
export async function getOwnedConversation(conversationId: string) {
    const tokenInfo = await auth.getTokenInfo();
    if (!tokenInfo?.subjectId || !tokenInfo?.subjectType) {
        throw new Error('Site identity is required');
    }

    const conversation = await getConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId, {
        fields: ['_id', 'metaData.siteUserId', 'metaData.siteUserType', 'messages'],
        consistentRead: true,
    });
    const expectedType = tokenInfo.subjectType.toLowerCase();
    if (!conversation || conversation.metaData?.siteUserId !== tokenInfo.subjectId
        || conversation.metaData?.siteUserType !== expectedType) {
        throw new Error('Conversation not found');
    }
    return conversation;
}
