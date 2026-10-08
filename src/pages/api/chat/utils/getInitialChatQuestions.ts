import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';

const getInitialChatQuestions = async () => {
    try {
        const elevatedQuery = auth.elevate(items.query);
        const result = await elevatedQuery(CollectionIds.CHAT_WIDGET_CONFIG).fields('chatQuestions').find();
        if (result.items.length > 0) {
            return result.items[0].chatQuestions;
            // returns e.d ['What is your name?', 'How can we help you?']
        }
        return [];
    } catch (error: any) {
        throw new Error("Failed to get initial chat questions: " + error.message);
    }
}

export default getInitialChatQuestions;