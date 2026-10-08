import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { members } from '@wix/members';
import { appInstances } from "@wix/app-management";
import { auth } from "@wix/essentials";
import { orders } from "@wix/ecom";
import { orders as pricingPlanOrders } from "@wix/pricing-plans";
import { captureError } from '../reportError';

interface TicketItem {
    _id?: string;
    primaryTicketNumber: string | number;
    subject: string;
    _createdDate: string;
}

const STORE_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';
const BOOKINGS_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';
const PRICING_PLANS_APP_ID = '1522827f-c56c-a5c9-2ac9-00f9e6ae12d3';

const getMemberTickets = async (memberId: string) => {
    try {
        let allItems: TicketItem[] = [];
        let results = await items.query(CollectionIds.TICKETS)
            .eq('memberId', memberId)
            .descending('_createdDate')
            .fields("_id", "primaryTicketNumber", "subject", "_createdDate")
            .limit(1000)
            .find();

        while (results.hasNext()) {
            allItems = allItems.concat(results.items as unknown as TicketItem[]);
            results = await results.next();
        }
        allItems = allItems.concat(results.items as unknown as TicketItem[]);

        // DB already sorts by _createdDate descending, so no in-memory sort needed
        return allItems.map((item) => ({
            id: item._id,
            appId: 'tickets',
            title: `#${item.primaryTicketNumber}`,
            subtitle: item.subject,
        }));
    } catch (error: any) {
        throw new Error(`Error fetching member tickets info: ${error.message}`);
    }
}

const getMemberInfo = async (memberId: string) => {
    try {
        const memberResponse = await members.getMember(memberId, { fieldsets: [members.Set.FULL] });
        return memberResponse;
    } catch (error: any) {
        throw new Error(`Error fetching member info: ${error.message}`);
    }
}

const getMemberOrders = async (memberId: string): Promise<any[]> => {
    try {
        const search = {
            filter: {
                "buyerInfo.contactId": { "$eq": memberId },
            },
        };
        const response: any = await orders.searchOrders(search);
        return response.orders || [];
    } catch (error: any) {
        throw new Error(`Error fetching member orders: ${error.message}`);
    }
}

const extractStoreOrders = (allOrders: any[]) => {
    return allOrders
        .filter((order: any) => order?.lineItems?.[0]?.catalogReference?.appId === STORE_APP_ID)
        .map((order: any) => ({
            id: order._id,
            appId: STORE_APP_ID,
            title: `#${order.number}`,
            subtitle: `${order.paymentStatus} -- ${order.fulfillmentStatus}`,
        }));
}

const extractBookings = (allOrders: any[]) => {
    return allOrders
        .filter((order: any) => order?.lineItems?.[0]?.catalogReference?.appId === BOOKINGS_APP_ID)
        .map((order: any) => ({
            id: order._id,
            appId: BOOKINGS_APP_ID,
            title: `#${order.number}`,
            subtitle: `${order.paymentStatus}`,
        }));
}

const getMemberPricingPlanSubscriptions = async (memberId: string): Promise<any[]> => {
    try {
        const options = {
            buyerIds: [memberId],
            sorting: {
                fieldName: 'createdDate',
                direction: 'DESC'
            }
        };
        const ordersList: any = await pricingPlanOrders.managementListOrders(options);
        return ordersList.orders?.map((order: any) => ({
            id: order.subscriptionId,
            appId: PRICING_PLANS_APP_ID,
            title: `${order.planName}`,
            subtitle: `${order.lastPaymentStatus && order.lastPaymentStatus === 'NOT_APPLICABLE' ? 'Payment Status Not Applicable' : order.lastPaymentStatus || 'Payment Status Unknown'}`,
        })) || [];
    } catch (error: any) {
        throw new Error(`Error fetching member pricing plan subscriptions: ${error.message}`);
    }
}

const getInstalledApps = async () => {
    try {
        const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);
        const response = await elevatedGetAppInstance();
        return response?.site?.installedWixApps;
    } catch (error: any) {
        throw new Error(`Error fetching installed apps: ${error.message}`);
    }
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const memberId = url.searchParams.get('id');

        if (!memberId) {
            status = 400;
            throw new Error('Member ID is required');
        }

        // Independent calls run concurrently instead of sequentially
        const [installedApps, memberInfo, memberTickets] = await Promise.all([
            getInstalledApps(),
            getMemberInfo(memberId),
            getMemberTickets(memberId),
        ]);

        const hasStores = installedApps?.includes('stores') ?? false;
        const hasBookings = installedApps?.includes('bookings') ?? false;
        const hasPaidPlans = installedApps?.includes('paid_plans') ?? false;
        const needsOrders = hasStores || hasBookings;

        // Fetch orders once (shared by stores + bookings) and pricing plans,
        // in parallel, only when the relevant app is installed
        const [allOrders, pricingPlanSubscriptions] = await Promise.all([
            needsOrders ? getMemberOrders(memberId) : Promise.resolve(undefined),
            hasPaidPlans ? getMemberPricingPlanSubscriptions(memberId) : Promise.resolve(undefined),
        ]);

        const storeOrdersResult = hasStores && allOrders ? extractStoreOrders(allOrders) : undefined;
        const bookings = hasBookings && allOrders ? extractBookings(allOrders) : undefined;

        const memberData = {
            member: memberInfo,
            tickets: memberTickets,
            storeOrders: storeOrdersResult,
            pricingPlanSubscriptions: pricingPlanSubscriptions,
            bookings: bookings,
        };

        return new Response(JSON.stringify({ success: true, memberData }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: "Error fetching view member data" }), {
            status: status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};