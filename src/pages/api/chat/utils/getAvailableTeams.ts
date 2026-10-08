import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';

const getAvailableTeams = async () => {
    try {
        const elevatedQuery = auth.elevate(items.query)
        const result = await elevatedQuery(CollectionIds.CHAT_WIDGET_CONFIG).fields('availableTeams').find();
        if (result.items.length > 0) {
            return result.items[0].availableTeams;
            // returns e.d [{ _id: 'teamId', name: 'teamName', tags: ['tag1', 'tag2'] }]
        }
        return [];
    } catch (error: any) {
        throw new Error("Failed to get available teams: " + error.message);
    }
}

export default getAvailableTeams;