import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';

const initialChatQuestionsEnabled = async () => {
    try {
        const elevatedQuery = auth.elevate(items.query);
        const result = await elevatedQuery(CollectionIds.CHAT_WIDGET_CONFIG).fields('enableChatQuestions').find();
        if (result.items.length > 0) {
            return result.items[0].enableChatQuestions;
            // returns boolean
        }
        return false;   
    } catch (error: any) {
        throw new Error("Failed to determine if initial chat questions are enabled: " + error.message);
    }
}

export default initialChatQuestionsEnabled;