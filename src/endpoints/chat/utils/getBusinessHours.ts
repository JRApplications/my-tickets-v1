import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';

const getBusinessHours = async () => {
    try {
        const elevatedQuery = auth.elevate(items.query);
        const result = await elevatedQuery(CollectionIds.CHAT_WIDGET_CONFIG).fields('businessSupportHours').find();
        if (result.items.length > 0) {
            return result.items[0].businessSupportHours;
        }
        return null;
    } catch (error: any) {
        throw new Error("Failed to get business hours: " + error.message);
    }
}

export default getBusinessHours;