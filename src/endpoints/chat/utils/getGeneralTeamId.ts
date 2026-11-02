import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';

const getGeneralTeamId = async () => {
    try {
        const elevatedQuery = auth.elevate(items.query);
        const result = await elevatedQuery(CollectionIds.CHAT_WIDGET_CONFIG).fields('generalTeamId').find();
        if (result.items.length > 0) {
            return result.items[0].generalTeamId;
            // returns uuidv4 string
        }
        return null;
    } catch (error: any) {
        throw new Error("Failed to get general team ID: " + error.message);
    }
}

export default getGeneralTeamId;